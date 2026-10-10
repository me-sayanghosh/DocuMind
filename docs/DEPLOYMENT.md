# DEPLOYMENT

## 1. Environments

| Env | Purpose | Infra |
|---|---|---|
| local | Development | Docker Compose (db, redis, api, worker, web) |
| ci | Automated tests | GitHub Actions services |
| staging | Pre-release checks | Docker Compose or cloud sandbox |
| production | Live website | Docker Compose on VPS (DigitalOcean, Hetzner, AWS EC2) or PaaS (Railway/Render) |

## 2. Containers

### Images
- `backend` (one image, two commands): `uvicorn app.main:app --host 0.0.0.0 --port 8000` and `arq app.worker.WorkerSettings`.
- `frontend`: multi-stage build → static files served by nginx (or deploy to Vercel/Netlify/Cloudflare Pages).
- Postgres: `pgvector/pgvector:pg16`. Redis: `redis:7-alpine`.

### Dockerfile guidelines
- Slim Python 3.12 base, multi-stage, non-root user, pinned dependencies (lock file), `PYTHONUNBUFFERED=1`.
- Pre-download embedding/reranker weights at build time (or into a mounted volume) to avoid cold-start downloads.
- Use CPU-only torch wheels to keep image size and RAM down.
- Healthcheck: `GET /healthz`.

### docker-compose.yml (local, outline)
```yaml
services:
  db:      { image: pgvector/pgvector:pg16, env_file: .env, volumes: [pgdata:/var/lib/postgresql/data], ports: ["5432:5432"] }
  redis:   { image: redis:7-alpine }
  api:     { build: ./backend, command: uvicorn app.main:app --reload --host 0.0.0.0, env_file: .env, depends_on: [db, redis], ports: ["8000:8000"], volumes: [./backend:/app, uploads:/data/uploads] }
  worker:  { build: ./backend, command: arq app.worker.WorkerSettings, env_file: .env, depends_on: [db, redis], volumes: [uploads:/data/uploads] }
  web:     { build: ./frontend, ports: ["5173:5173"] }
volumes: { pgdata: {}, uploads: {} }
```

## 3. Configuration

| Variable | Notes |
|---|---|
| DATABASE_URL | `postgresql+asyncpg://…` |
| REDIS_URL | |
| ANTHROPIC_API_KEY | secret |
| LLM_MODEL / LLM_FAST_MODEL | e.g. a Sonnet-class model for answers, a Haiku-class model for rewrite/eval generation |
| EMBED_MODEL / EMBED_DIM | must match DB vector column |
| RERANK_MODEL | |
| JWT_SECRET | ≥ 32 random bytes |
| CORS_ORIGINS | exact web origins |
| STORAGE_BACKEND | `local` or `s3` (+ bucket, endpoint, keys) |
| MAX_UPLOAD_MB, MAX_PAGES | limits |
| RELEVANCE_THRESHOLD | tuned from eval |
| SENTRY_DSN | optional |

`.env.example` documents all; production values live in the platform secret store.

## 4. Production Topology

### 4.1 VPS / Dedicated Cloud VM (Recommended)
An all-in-one, highly cost-effective setup that runs all services on a single server (DigitalOcean Droplet, Hetzner Cloud, AWS EC2, Linode with 2–4 vCPU, 4–8 GB RAM).

- **Architecture:** `db` (pgvector 16), `redis` (Redis 7), `api` (FastAPI), `worker` (ARQ), `web` (Nginx), and optional `caddy` (automatic HTTPS Let's Encrypt certificates).
- **Storage:** Persistent Docker volumes `uploads` and `pgdata`.
- **Quick Deploy:**
  ```bash
  # 1. Setup production environment
  cp .env.production.example .env
  # Configure GEMINI_API_KEY, JWT_SECRET, and POSTGRES_PASSWORD

  # 2. Deploy the stack
  make prod-up
  # Or run automated verification & deploy script:
  ./scripts/deploy.sh
  ```
- **Automatic HTTPS with Caddy:**
  ```bash
  DOMAIN=yourdomain.com docker compose -f docker-compose.prod.yml --profile ssl up -d
  ```

### 4.2 PaaS (Railway / Render)
- **Services:** web (static), api (web service), worker (background worker), Postgres (managed, pgvector enabled), Redis (managed).
- **Storage:** managed object storage (S3-compatible: Cloudflare R2, Backblaze B2, or AWS S3).
- **Resources:** api 512 MB–1 GB; worker 1–2 GB.
- **Run migrations** as a pre-deploy release command: `alembic upgrade head`.
- **Domain/TLS:** managed certificates; API on `api.<domain>`, web on apex or `app.<domain>`.
- Enable pgvector: `CREATE EXTENSION vector;`.

## 5. CI/CD (GitHub Actions)

```
PR:        lint · types · tests · build · security scans (see TESTING.md)
main:      all PR checks → build & push images (GHCR) tagged with git SHA
           → deploy staging (optional) → smoke test → deploy production
tag vX.Y:  release notes + production deploy
```
- Deploy via platform's GitHub integration or `railway up` / Render deploy hook.
- Database migrations must be backward compatible (expand → migrate → contract) so rollbacks are safe.
- Rollback: redeploy previous image SHA; if a migration is not reversible, restore from backup.

## 6. Operations

### Observability
- Structured JSON logs to platform log drain; Sentry for API, worker, and frontend.
- `/healthz` liveness, `/readyz` readiness (DB + Redis); uptime monitor (UptimeRobot/Better Stack).
- Admin metrics page from `query_traces`; optional Prometheus endpoint.

### Backups and recovery
- Daily automated Postgres backups, 7–14 days retention; monthly restore drill.
- Object storage versioning or lifecycle rules; document RPO ≈ 24 h, RTO ≈ 2 h.

### Scaling levers
1. Add worker instances for ingestion throughput.
2. Increase API replicas (stateless).
3. Tune HNSW (`ef_search`), add `chunks` partitioning by workspace beyond ~1M rows.
4. Cache hot queries; reduce rerank candidates.

### Cost controls
LLM quotas per user, dev/demo account caps, spend alerts, local models for embedding/rerank, small model for rewrite and eval question generation.

## 7. Demo hardening
- Seed a **demo workspace** with 3–5 public PDFs and a prebuilt eval report so reviewers see value in 30 seconds.
- Guest/demo login with strict quota; rate limits on.
- Cold-start mitigation: keep API warm (health pings) and preload models at startup.

## 8. Release checklist
- [ ] Migrations applied; `alembic current` matches head
- [ ] Secrets set; `JWT_SECRET` unique per env
- [ ] CORS and cookie settings verified over HTTPS
- [ ] Upload → ingest → chat verified in production with a fresh account
- [ ] Backups enabled; alerts configured
- [ ] README has architecture diagram, eval table, demo GIF, and live link
- [ ] Security checklist (SECURITY.md §9) complete
