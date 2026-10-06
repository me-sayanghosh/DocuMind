# SYSTEM-DESIGN

## 1. Context

```
Browser (React) ──HTTPS──▶ API (FastAPI) ──▶ PostgreSQL + pgvector
                              │  │                ▲
                              │  └──▶ Redis ◀──── Worker (ARQ)
                              │                    │
                              ├──▶ Claude API      ├──▶ Embedding model (local)
                              └──▶ Reranker (local)└──▶ Object storage (PDFs)
```

## 2. Components

| Component | Responsibility | Notes |
|---|---|---|
| Web (React/Vite) | UI, SSE consumption, PDF rendering | Static build served by CDN/nginx |
| API (FastAPI, async) | Auth, CRUD, orchestration of query pipeline, SSE | Stateless |
| Worker (ARQ) | PDF parse, chunk, embed, index; eval jobs | Scales horizontally |
| PostgreSQL + pgvector | System of record: users, docs, chunks, vectors, chats, eval | One DB, one transaction domain |
| Redis | Job queue, rate-limit counters, query cache | Ephemeral; no source of truth |
| Object storage | Original PDFs (local volume in dev, S3-compatible in prod) | Private, signed access |
| Claude API | Generation, query rewrite, eval question gen, judge | Model names via env |
| Embedder / Reranker | sentence-transformers (bge-small, cross-encoder MiniLM/bge-reranker) | Loaded once per process |

## 3. Key flows

### 3.1 Ingestion
1. Client uploads PDF → API validates (size, magic bytes), hashes, dedupes, stores file, inserts `documents(status=queued)`, enqueues job, returns 202.
2. Worker picks job → status `processing` → PyMuPDF extracts blocks per page with bboxes → chunker builds ~500-token chunks, 80-token overlap, never crossing page-boundary metadata loss (chunk stores page_start/page_end and bbox list).
3. Batch-embed chunks (32/batch) → bulk insert chunks with `embedding` and generated `tsv` column.
4. Status `ready` (or `failed` with error). Progress counters updated for UI.

### 3.2 Query
1. `POST /conversations/{id}/messages` (SSE).
2. Load last N turns; if follow-up, rewrite to standalone query (small model).
3. Retrieve: dense top-40 and FTS top-40, filtered by workspace (and doc scope).
4. Fuse with RRF → top-30 → cross-encoder rerank → top-6.
5. Relevance gate: if best rerank score < τ → emit refusal message.
6. Build prompt: system rules + delimited `<source id="n">` blocks + question. Stream Claude tokens as SSE `token` events.
7. Parse citation markers, emit `citations` event with doc/page/chunk/bbox, persist message and stage timings.

### 3.3 Evaluation
Worker job samples chunks → LLM generates question + reference answer per chunk (plus unanswerable decoys) → runner executes each retrieval mode → computes retrieval metrics → generates answers → LLM judge scores faithfulness and citation support → persisted in `eval_runs`/`eval_results`.

## 4. Design decisions and trade-offs

| Decision | Alternative | Why |
|---|---|---|
| pgvector in Postgres | Dedicated vector DB | One system, transactional deletes, tenant filtering via SQL, enough at this scale |
| HNSW index (cosine) | IVFFlat | Better recall/latency, no training step |
| FTS with `ts_rank_cd` | Elastic/BM25 service | Zero extra infra; adequate lexical signal |
| RRF fusion | Weighted score blending | Scale-free, no tuning across incomparable scores |
| Cross-encoder rerank | LLM rerank | Cheaper, faster, deterministic |
| ARQ | Celery | Native asyncio, simpler config |
| SSE | WebSockets | One-way streaming, simpler, proxy friendly |
| Local embeddings | Hosted API | Zero cost; swap behind `Embedder` interface |
| Hard delete | Soft delete | Privacy requirement |

## 5. Scaling and capacity
- Chunk volume estimate: 100-page PDF ≈ 150–250 chunks; 1,000 docs ≈ 250k chunks ≈ 380 MB of 384-d float vectors (plus HNSW overhead ~2x).
- Filtering by workspace: use a btree on `(workspace_id)` plus partial approach; at larger scale, partition `chunks` by workspace hash. Set `hnsw.iterative_scan` (pgvector ≥ 0.8) so filtered queries don't under-return.
- Bottlenecks in order: embedding CPU, reranker latency, LLM latency. Mitigate with batching, caching, and limiting rerank candidates.
- Backpressure: queue length cap per user; reject uploads when user has > 5 queued docs.

## 6. Reliability
- Idempotent ingest keyed by `document_id`; re-run deletes existing chunks first.
- Retries with exponential backoff; dead-letter state = `failed` with reason.
- Graceful LLM failure: surface error event, no partial message persisted as complete.
- Health: `/healthz` (process), `/readyz` (DB + Redis).

## 7. Observability
- JSON logs with `request_id`, `user_id`, `workspace_id`, no content text.
- Timings table `query_traces` (stage durations, mode, k, scores).
- Metrics endpoint (Prometheus format) optional; admin UI reads traces.

## 8. Failure modes
| Failure | Behavior |
|---|---|
| Corrupt/encrypted PDF | `failed` + friendly error |
| Worker crash mid-ingest | Job retried; chunks rewritten idempotently |
| Claude rate limit/outage | Retry with jitter, then error event |
| Redis down | Uploads rejected with 503; queries degrade without cache/limits |
| Empty retrieval | Refusal path |
