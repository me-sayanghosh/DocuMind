# REQUIREMENTS

Priority: **M** must, **S** should, **C** could. Each ID maps to tests in TESTING.md.

## 1. Functional requirements

### Accounts and tenancy
- FR-1 (M) Users register with email + password and log in; sessions use JWT access + refresh tokens.
- FR-2 (M) Each user has at least one workspace; all documents, chunks, chats belong to exactly one workspace.
- FR-3 (M) Every data query is filtered by `workspace_id` derived from the authenticated membership, never trusted from the client body alone.
- FR-4 (C) Workspace invites with roles (owner, member).

### Documents
- FR-10 (M) Upload PDFs (max 25 MB, max 300 pages, `application/pdf` verified by magic bytes).
- FR-11 (M) Dedupe within a workspace by SHA-256; return existing document.
- FR-12 (M) Status lifecycle `queued → processing → ready | failed` with error message, visible via polling/SSE.
- FR-13 (M) Ingestion extracts text per page, chunks with overlap, preserves page number and bounding boxes, embeds and stores.
- FR-14 (M) Delete a document cascades to chunks, embeddings, file in storage, and citation rows.
- FR-15 (S) Re-ingest a document (new chunking params) without re-upload.
- FR-16 (S) Warn when pages have no extractable text.

### Retrieval and answering
- FR-20 (M) Dense retrieval with pgvector cosine similarity.
- FR-21 (M) Lexical retrieval with Postgres full-text search.
- FR-22 (M) Fuse via Reciprocal Rank Fusion (k=60), then cross-encoder rerank top-N to top-k.
- FR-23 (M) Retrieval mode selectable by config/query flag (`vector`, `fts`, `hybrid`, `hybrid_rerank`) for evaluation.
- FR-24 (M) Scope search to one document, a set, or the whole workspace.
- FR-25 (M) Answers stream via SSE; final event contains structured citations.
- FR-26 (M) Each claim cites numbered sources `[1]`, mapping to (document, page, chunk, bbox).
- FR-27 (M) If top relevance score is below threshold or the model signals insufficient context, respond "I couldn't find this in your documents."
- FR-28 (S) Follow-up questions are rewritten into standalone queries using conversation history.
- FR-29 (M) Retrieved text is treated as untrusted data (see SECURITY.md).

### Conversations
- FR-30 (M) Create, list, rename, delete conversations; messages persisted with citations and retrieval metadata.
- FR-31 (S) Regenerate last answer; thumbs up/down feedback stored.

### UI
- FR-40 (M) Library view with upload (drag-drop), per-file progress/status, delete.
- FR-41 (M) Chat view with streaming, citation chips, stop-generation.
- FR-42 (M) Split view: PDF viewer scrolls to cited page and highlights cited text.
- FR-43 (S) Document scope picker; empty/error/loading states everywhere.

### Evaluation
- FR-50 (M) CLI generates a question set from a workspace's documents (question, gold chunk ids, reference answer).
- FR-51 (M) CLI runs the set across retrieval modes, computing hit@k, MRR, recall@k.
- FR-52 (M) Answer-level metrics: faithfulness (LLM judge) and citation accuracy.
- FR-53 (M) Results saved to DB and exported as Markdown table + JSON.
- FR-54 (S) Admin page renders runs and compares them.

### Limits and ops
- FR-60 (S) Per-user rate limits (requests/min) and daily token/question quotas.
- FR-61 (S) Cache identical (workspace, query, mode) results with TTL; invalidated on document change.
- FR-62 (S) Per-stage latency logged (rewrite, retrieve, fuse, rerank, generate) and shown in admin view.

## 2. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Performance | Retrieval + rerank p95 < 800 ms for ≤ 50k chunks; first token < 2.5 s |
| NFR-2 | Performance | 100-page PDF ingested < 60 s p95 on 2 vCPU |
| NFR-3 | Scalability | API stateless; workers horizontally scalable via Redis queue |
| NFR-4 | Reliability | Ingestion jobs idempotent, retried with backoff (max 3), failures surfaced |
| NFR-5 | Security | OWASP ASVS L1 baseline; see SECURITY.md |
| NFR-6 | Privacy | No document text in logs; delete is hard delete |
| NFR-7 | Observability | Structured JSON logs, request id, `/healthz` and `/readyz` |
| NFR-8 | Quality | Backend coverage ≥ 80%; type-checked (mypy strict on app code) |
| NFR-9 | Accessibility | WCAG 2.1 AA for core flows; keyboard navigable chat and library |
| NFR-10 | Portability | One-command local run via Docker Compose |
| NFR-11 | Maintainability | Layered architecture, no business logic in route handlers |
| NFR-12 | Cost | Local embedding + reranker; LLM spend capped by quotas |

## 3. Constraints
- Python 3.12, PostgreSQL 16 with pgvector ≥ 0.7, Redis 7.
- Embedding dimension fixed per deployment (default 384).
- Free-tier hosting memory limits (~512 MB–1 GB) affect model choice.

## 4. Acceptance criteria (release gate)
1. Two users cannot see each other's documents/chunks via any endpoint (automated test).
2. Upload → ready → cited answer works end to end in the browser.
3. Eval report shows hybrid_rerank ≥ vector on hit@5 with real numbers in README.
4. Unanswerable questions in the eval set trigger refusal ≥ 90% of the time.
5. CI green: lint, types, unit, integration, frontend tests, build.
