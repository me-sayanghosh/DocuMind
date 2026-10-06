# WORKFLOW

Covers runtime workflows (what happens) and the development workflow (how you build it).

## 1. Runtime workflows

### 1.1 Sign up → first answer (user journey)
```
Register → default workspace created → Library (empty state)
→ Drag PDF → upload progress → status: queued → processing (x/y chunks) → ready
→ New chat → ask → streaming answer + citation chips
→ click [1] → PDF opens at page, passage highlighted
```

### 1.2 Document ingestion state machine
```
            upload ok
 (none) ───────────────▶ queued ──worker picks──▶ processing ──all chunks stored──▶ ready
                           │                          │
                           │ validation fails (sync)  │ error / timeout (after 3 retries)
                           ▼                          ▼
                       rejected (4xx)               failed (error message, can re-ingest or delete)
```
Steps inside `processing`:
1. Download file from storage, open with PyMuPDF (reject encrypted/corrupt).
2. For each page: extract text blocks with bboxes; flag pages with < 20 chars as "no text".
3. Normalize (de-hyphenate, collapse whitespace, strip repeated headers/footers by frequency heuristic).
4. Chunk: target 500 tokens, 80 overlap, split on paragraph/sentence boundaries; record `page_start/end` and merged bboxes.
5. Embed in batches of 32 (off the event loop); bulk insert; update `chunks_done`.
6. Mark `ready`; invalidate workspace query cache.

Idempotency: step 5 first deletes existing chunks for the document. Retry policy: 3 attempts, exponential backoff (10s, 60s, 5m).

### 1.3 Query workflow
```
question
  ├─ quota + rate-limit check
  ├─ cache lookup (workspace, standalone_query, mode, scope, corpus_version)
  ├─ [follow-up?] rewrite → standalone query
  ├─ dense ∥ FTS (parallel) → RRF → top 30
  ├─ cross-encoder rerank → top 6
  ├─ relevance gate (best score < τ ?) ── yes ─▶ refusal answer
  ├─ build prompt (sources as data) → Claude stream
  ├─ extract [n] markers → map to chunks/bboxes → citations event
  └─ persist message, citations, trace timings, usage
```
Cancellation: client abort or `/stop` cancels the upstream Claude stream and stores `status=stopped`.

### 1.4 Evaluation workflow
```
select workspace/docs → sample chunks (stratified by doc and position)
→ LLM generates {question, reference_answer} per chunk (+ unanswerable decoys, + paraphrased/keyword-heavy variants)
→ dedupe/validate questions (answerable only from gold chunk)
→ for each mode in [vector, fts, hybrid, hybrid_rerank]:
     retrieve → record hit@k, rank → generate answer → judge faithfulness + citation support
→ aggregate → store → export Markdown table for README
```
Fix random seed and record config so runs are reproducible; always report the number of questions.

### 1.5 Deletion workflow
`DELETE document` → verify membership → delete row (cascade chunks) → enqueue file removal → invalidate cache → UI removes entry optimistically, rolls back on error.

## 2. Development workflow

### 2.1 Branching and commits
- Trunk-based with short-lived branches `feat/…`, `fix/…`; PR per vertical slice; squash merge.
- Conventional commits (`feat:`, `fix:`, `test:`, `docs:`).
- Each PR: tests + docs update if behavior/contract changed.

### 2.2 Local loop
```
make up        # docker compose up db redis
make api       # uvicorn --reload
make worker    # arq app.worker.WorkerSettings
make web       # vite dev
make test      # pytest + vitest
make eval      # run evaluation on fixture corpus
make migrate   # alembic upgrade head
```

### 2.3 Definition of done (per feature)
1. Requirement ID referenced.
2. Unit + integration tests written and passing.
3. Types/lint clean; migration included if schema changed.
4. API.md / DATABASE.md updated when needed.
5. Manually exercised in the UI or via curl.

### 2.4 Weekly cadence
| Week | Goal | Demo at end |
|---|---|---|
| 0 | Docs, scaffold, CI | Compose boots, CI green |
| 1 | Core pipeline | curl upload + ask |
| 2 | Hybrid, streaming, citations (+ UI shell) | Browser chat with citations |
| 3 | Viewer highlights, eval, limits, deploy | Public URL + results table |

### 2.4.1 Daily plan template
Morning: one vertical slice (DB → service → route → test). Afternoon: UI or quality work. End of day: update checklist, commit, note blockers.

### 2.5 Eval-driven iteration
Change one retrieval parameter at a time (chunk size, overlap, k, RRF k, rerank depth, threshold), run `make eval`, record in `docs/adr/` or README results history. Don't tune on the same questions you report; keep a held-out split.
