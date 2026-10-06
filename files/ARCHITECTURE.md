# ARCHITECTURE

## 1. Tech stack

| Layer | Choice |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic |
| DB | PostgreSQL 16 + pgvector, `asyncpg` driver |
| Queue | ARQ + Redis 7 |
| PDF | PyMuPDF (fitz) |
| Embeddings | sentence-transformers `BAAI/bge-small-en-v1.5` (384-d), behind interface |
| Reranker | cross-encoder (`BAAI/bge-reranker-base` or MiniLM variant) |
| LLM | Anthropic SDK (Claude), streaming; model names from env |
| Auth | argon2 password hashing, PyJWT |
| Frontend | React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind, react-pdf (pdf.js) |
| Tooling | uv or poetry, ruff, mypy, pytest, Vitest, Playwright, Docker Compose, GitHub Actions |

## 2. Monorepo layout

```
docchat/
├── docs/                      # these documents
├── backend/
│   ├── app/
│   │   ├── main.py            # app factory, middleware, routers
│   │   ├── core/              # config, security, logging, deps, errors
│   │   ├── db/                # engine, session, base, migrations/ (alembic)
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── api/v1/            # routers: auth, workspaces, documents, conversations, admin, eval
│   │   ├── services/          # business logic (no HTTP concerns)
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py
│   │   │   ├── chat_service.py
│   │   │   └── quota_service.py
│   │   ├── rag/
│   │   │   ├── parser.py      # PyMuPDF → pages/blocks/bboxes
│   │   │   ├── chunker.py
│   │   │   ├── embedder.py    # Embedder protocol + implementations
│   │   │   ├── retrievers.py  # vector, fts, hybrid(RRF)
│   │   │   ├── reranker.py
│   │   │   ├── prompts.py     # templates, injection-safe formatting
│   │   │   ├── generator.py   # Claude streaming client
│   │   │   └── pipeline.py    # orchestrates a query, emits timings
│   │   ├── worker/            # ARQ settings and tasks (ingest, eval)
│   │   └── evals/             # generate, run, metrics, judge, report
│   ├── tests/ (unit/, integration/, e2e/, fixtures/pdfs/)
│   ├── alembic.ini
│   └── pyproject.toml
├── frontend/
│   ├── src/ (app/, features/{auth,library,chat,viewer,admin}, components/, lib/, hooks/)
│   └── tests/
├── deploy/ (compose files, nginx.conf, render.yaml / railway.json)
├── .github/workflows/
├── docker-compose.yml
├── Makefile
└── README.md
```

## 3. Layering rules

```
api (routes) → services → rag / repositories → db
```
- Routes: parse input, call a service, shape output. No SQL, no business rules.
- Services: transactions, authorization checks, orchestration.
- `rag/`: pure-ish retrieval/generation logic; takes a session and interfaces, easy to test and to call from eval harness.
- Models never imported by the frontend contract; schemas are the API contract.
- Dependency direction only downward; cross-cutting (config, logging) in `core`.

## 4. Key interfaces

```python
class Embedder(Protocol):
    dim: int
    async def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    async def embed_query(self, text: str) -> list[float]: ...

class Retriever(Protocol):
    async def retrieve(self, q: Query, k: int) -> list[Candidate]: ...

class Reranker(Protocol):
    async def rerank(self, query: str, cands: list[Candidate], k: int) -> list[Candidate]: ...

class LLM(Protocol):
    def stream(self, system: str, messages: list[Msg]) -> AsyncIterator[str]: ...
    async def complete(self, system: str, messages: list[Msg], model: str) -> str: ...
```
Retrieval modes in the eval harness are just different compositions of these.

## 5. Concurrency model
- API fully async; CPU-bound model inference (embedding, rerank) runs in a thread/process pool via `run_in_executor` so the event loop stays responsive.
- Models loaded once at startup (API for rerank/query-embed; worker for doc-embed).
- DB: async session per request; pool size tuned (e.g. 10 + overflow 10).

## 6. Configuration
12-factor via `pydantic-settings`: `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `LLM_MODEL`, `LLM_FAST_MODEL`, `EMBED_MODEL`, `EMBED_DIM`, `JWT_SECRET`, `STORAGE_BACKEND`, `MAX_UPLOAD_MB`, `RELEVANCE_THRESHOLD`, etc. `.env.example` committed; secrets never.

## 7. Error handling and logging
- Domain exceptions (`NotFound`, `Forbidden`, `QuotaExceeded`, `IngestionError`) mapped to RFC 7807 problem responses by a central handler.
- Structured logging (structlog); request-id middleware; no document content in logs.

## 8. Architecture decision records
Keep short ADRs in `docs/adr/` for: pgvector choice, RRF over weighted blend, local vs hosted embeddings, SSE over WebSockets, chunking parameters (updated after eval).
