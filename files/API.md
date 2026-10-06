# API

Base path `/api/v1`. JSON unless noted. Auth: `Authorization: Bearer <access_token>`. Workspace-scoped routes use `/workspaces/{workspace_id}/...`; membership is verified on every call. OpenAPI is auto-generated at `/docs`.

## 1. Conventions
- IDs: UUID strings. Timestamps: ISO 8601 UTC.
- Pagination: `?limit=20&cursor=<opaque>` → `{ items: [], next_cursor }`.
- Errors (RFC 7807):
```json
{ "type": "about:blank", "title": "Quota exceeded", "status": 429,
  "detail": "Daily question limit reached", "code": "QUOTA_EXCEEDED", "request_id": "..." }
```
- Codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found (also used for cross-tenant to avoid leaking existence), 409 conflict, 413 too large, 415 wrong type, 422 schema error, 429 rate/quota, 503 dependency down.

## 2. Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | /auth/register | `{email, password}` | 201 `{user}` (also creates default workspace) |
| POST | /auth/login | `{email, password}` | `{access_token, expires_in, user}`; sets httpOnly `refresh_token` cookie |
| POST | /auth/refresh | cookie | `{access_token, expires_in}` (rotates refresh token) |
| POST | /auth/logout | cookie | 204 (revokes refresh token) |
| GET | /me | | `{user, workspaces[]}` |

## 3. Workspaces

| Method | Path | Notes |
|---|---|---|
| GET | /workspaces | list mine |
| POST | /workspaces | `{name}` |
| PATCH | /workspaces/{ws} | rename (owner) |
| DELETE | /workspaces/{ws} | owner; hard delete everything |
| POST | /workspaces/{ws}/invites | (P2) `{email, role}` |

## 4. Documents

| Method | Path | Notes |
|---|---|---|
| POST | /workspaces/{ws}/documents | multipart `file`; 202 `{document}`; 200 with `{document, duplicate: true}` if same hash exists |
| GET | /workspaces/{ws}/documents | list with status, page_count, progress |
| GET | /workspaces/{ws}/documents/{id} | detail |
| GET | /workspaces/{ws}/documents/{id}/file | streams PDF (auth required) or short-lived signed URL |
| GET | /workspaces/{ws}/documents/{id}/events | SSE: `{status, chunks_done, chunks_total, error}` until terminal |
| POST | /workspaces/{ws}/documents/{id}/reingest | (S) |
| DELETE | /workspaces/{ws}/documents/{id} | 204; removes chunks, vectors, file |

Document object:
```json
{ "id": "...", "filename": "contract.pdf", "status": "processing",
  "page_count": 42, "chunks_done": 80, "chunks_total": 210,
  "error": null, "created_at": "..." }
```

## 5. Conversations and chat

| Method | Path | Notes |
|---|---|---|
| GET | /workspaces/{ws}/conversations | list |
| POST | /workspaces/{ws}/conversations | `{title?, doc_ids?}` |
| PATCH | /conversations/{id} | rename / change scope |
| DELETE | /conversations/{id} | 204 |
| GET | /conversations/{id}/messages | history incl. citations |
| POST | /conversations/{id}/messages | **SSE** — send a question |
| POST | /messages/{id}/feedback | `{value: 1 \| -1}` |
| POST | /messages/{id}/stop | cancel generation (or client aborts the stream) |

### POST /conversations/{id}/messages
Request:
```json
{ "content": "What is the termination notice period?",
  "mode": "hybrid_rerank",     // optional; default from config
  "doc_ids": ["..."] }          // optional override of scope
```
Response `text/event-stream`, events in order:

```
event: status      data: {"stage":"rewriting"|"retrieving"|"reranking"|"generating"}
event: rewrite     data: {"standalone_query":"..."}               (only if rewritten)
event: sources     data: {"items":[{"n":1,"document_id":"..","page":7,"chunk_id":"..","snippet":"..","score":0.83}]}
event: token       data: {"text":"The notice period is "}
event: token       data: {"text":"30 days [1]."}
event: citations   data: {"items":[{"n":1,"document_id":"..","filename":"contract.pdf","page":7,"chunk_id":"..","bboxes":[{"page":7,"x0":72,"y0":210,"x1":520,"y1":260}]}]}
event: done        data: {"message_id":"..","status":"complete","timings":{"retrieve_ms":120,"rerank_ms":210,"first_token_ms":1400,"total_ms":3200}}
event: error       data: {"code":"LLM_UNAVAILABLE","message":"..."}
```
Refusal: `token` with the fixed "I couldn't find this in your documents." text, then `done` with `status: "refused"` and empty citations.

Client reads with `fetch` + `ReadableStream` (EventSource cannot send Authorization headers or POST bodies).

## 6. Search (debug / power users)

`POST /workspaces/{ws}/search` `{query, mode, k, doc_ids?}` → ranked chunks with per-stage scores. Used by the UI "inspect retrieval" drawer and eval tooling.

## 7. Evaluation (admin or workspace owner)

| Method | Path | Notes |
|---|---|---|
| POST | /workspaces/{ws}/evals | `{n_questions, modes[], k, include_unanswerable}` → 202 `{run_id}` |
| GET | /workspaces/{ws}/evals | list runs |
| GET | /workspaces/{ws}/evals/{run} | summary metrics table + per-question rows |
| GET | /workspaces/{ws}/evals/{run}/export?format=md\|json | report |

Summary shape:
```json
{ "modes": { "vector": {"hit@5":0.71,"mrr":0.52,"faithfulness":0.88,"citation_acc":0.84,"refusal_correct":0.80},
             "hybrid_rerank": {"hit@5":0.88,"mrr":0.69,"faithfulness":0.93,"citation_acc":0.91,"refusal_correct":0.92} } }
```
(Numbers are illustrative; real ones come from runs.)

## 8. Admin

| GET /admin/metrics | latency percentiles per stage, query volume, failure rate |
| GET /admin/usage | per-user usage (admin only) |

## 9. System

`GET /healthz`, `GET /readyz`, `GET /version` (no auth).

## 10. Limits
- Upload: 25 MB, 300 pages.
- Message: 4,000 chars.
- Rate limit: 30 req/min/user general, 10 chat messages/min/user; daily quota configurable. Headers: `X-RateLimit-Remaining`, `Retry-After`.
- Idempotency: `Idempotency-Key` header supported on upload.
