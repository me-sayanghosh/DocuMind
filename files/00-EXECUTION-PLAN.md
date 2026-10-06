# Execution Plan — DocChat RAG (working name)

Multi-tenant "chat with your PDFs" SaaS with **hybrid retrieval, verifiable citations, and a built-in evaluation harness**.

## Document map

| Doc | Purpose | Write it when |
|---|---|---|
| PRD.md | Problem, users, scope, success metrics | Day 1 |
| REQUIREMENTS.md | Functional and non-functional requirements, IDs | Day 1 |
| SYSTEM-DESIGN.md | Components, data flow, scaling, trade-offs | Day 2 |
| ARCHITECTURE.md | Repo layout, modules, layering, tech choices | Day 2 |
| DATABASE.md | Schema, indexes, migrations | Day 3 |
| API.md | Endpoints, schemas, errors, SSE contract | Day 3 |
| AUTH.md | Identity, tokens, tenancy enforcement | Day 3 |
| WORKFLOW.md | Ingestion, query, eval, dev workflows | Day 4 |
| DESIGN.md | Visual language, UX principles | Day 4 |
| UI-COMPONENTS.md | Component tree, props, states | Day 4 |
| SECURITY.md | Threat model, controls, checklist | Day 5 |
| TESTING.md | Test pyramid, eval harness, CI gates | Day 5 |
| DEPLOYMENT.md | Environments, CI/CD, ops | Day 5 |

Write docs first (about 5 days, lightweight), then build. Keep them in `/docs`, update them as decisions change.

## Phases

### Phase 0 — Foundations (Days 1–5)
- Write all docs above (short, decision-focused).
- Create repo, monorepo layout, Docker Compose (api, worker, postgres+pgvector, redis, web), pre-commit (ruff, mypy, eslint, prettier), GitHub Actions skeleton.
- **Exit:** `docker compose up` boots empty stack; CI green on a hello-world test.

### Phase 1 — Core pipeline (Week 1)
- Alembic migrations: users, workspaces, memberships, documents, chunks.
- Auth: register/login/refresh, workspace creation, tenancy dependency.
- Upload endpoint with hash dedupe; ARQ worker: parse (PyMuPDF) → chunk (page-aware) → embed → store.
- Status tracking `queued → processing → ready | failed`.
- `/ask` v1: vector top-k → Claude answer (non-streaming).
- **Exit:** upload a PDF via curl, ask a question, get an answer with chunk ids.

### Phase 2 — Quality (Week 2)
- Postgres FTS (`tsvector` + GIN), RRF fusion, cross-encoder rerank.
- Query rewriting for follow-ups, conversation persistence.
- SSE streaming, structured citations (doc, page, chunk, char offsets), "not found" refusal path with a relevance threshold.
- Prompt-injection hardening (chunks as delimited data).
- **Exit:** streaming chat with page-level citations; hybrid beats vector on a hand-made 20-question set.

### Phase 3 — Frontend (Weeks 2–3, overlapping)
- Vite + React + TS app: auth, workspace switcher, library with upload progress/status, chat with streaming, PDF viewer with highlight, settings.
- **Exit:** full user journey works in browser.

### Phase 4 — Proof and polish (Week 3)
- Eval harness: synthetic question generation, metrics (hit@k, MRR, faithfulness, citation accuracy), CLI plus admin results page, README table.
- Rate limits, usage quotas, query cache, stage latency logging, admin view.
- Tests to targets in TESTING.md; deploy; demo GIF; README with architecture diagram and results.
- **Exit:** public URL, results table filled with real numbers, resume bullets backed by data.

## Milestone checklist

- [ ] M0 docs + scaffold + CI
- [ ] M1 upload → ready → ask works
- [ ] M2 hybrid + rerank + streaming + citations
- [ ] M3 UI complete with PDF highlight
- [ ] M4 eval results published, deployed, demo recorded

## Cut line (if time runs short)
Keep: hybrid search, citations, eval harness. Cut first: admin dashboard, caching, multi-member workspaces (keep single-owner), OAuth.

## Risks

| Risk | Mitigation |
|---|---|
| PDF parsing quality (scans, tables) | Detect low-text pages, flag them; OCR as stretch |
| PDF highlight alignment | Store bbox from PyMuPDF per chunk early (Phase 1), not later |
| Eval numbers look weak | Report honestly; show ablation; iterate chunk size and k |
| LLM cost | Small models for rewrite/eval generation, caching, quotas |
| Scope creep | Cut line above; every addition needs a REQUIREMENTS ID |
