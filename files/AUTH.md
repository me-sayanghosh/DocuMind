# AUTH

## 1. Goals
Authenticate users, authorize every request to a workspace, and make cross-tenant access structurally difficult.

## 2. Identity
- Email + password in v1. Passwords hashed with **argon2id** (`argon2-cffi`, default params tuned to ~100 ms).
- Password rules: min 10 chars, check against a small common-password list, no composition theatrics.
- Optional later: Google OAuth (OIDC), email verification, password reset via signed one-time token.

## 3. Tokens

| Token | Format | Lifetime | Storage |
|---|---|---|---|
| Access | JWT (HS256, or RS256/EdDSA if multi-service), claims `sub`, `iat`, `exp`, `jti` | 15 min | In memory on the client (not localStorage) |
| Refresh | Opaque random 256-bit, **hash stored in DB** | 14 days, rotated on every use | `httpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` cookie |

- Refresh rotation with reuse detection: if a revoked token is presented, revoke the whole token family and force re-login.
- Logout revokes the refresh token; access tokens expire quickly.
- Client refreshes silently on 401 once, then redirects to login.
- CSRF: refresh endpoint is cookie-authenticated, so require a custom header (`X-Requested-With`) and restrict CORS origins; SameSite protects the rest. API calls use Bearer headers, not cookies.

## 4. Authorization model

```
User ──member of──▶ Workspace ──owns──▶ Documents, Chunks, Conversations, Eval runs
```
Roles: `owner` (all, incl. delete workspace, run evals, invite), `member` (read documents, chat, upload). Platform `is_admin` flag gates `/admin/*`.

### Enforcement (layered)
1. **Dependency** `get_current_user` validates the JWT and loads the user.
2. **Dependency** `get_workspace_ctx(ws_id)` loads membership, rejects with 404 if not a member, returns `{user, workspace, role}`.
3. **Service layer** requires a `WorkspaceCtx` argument for every data-touching function; repositories add `WHERE workspace_id = ctx.workspace.id`. There is no repository method without a workspace parameter for tenant tables.
4. **Resource-by-id routes** (`/conversations/{id}`, `/messages/{id}`) resolve the resource, then check membership of its workspace.
5. **Postgres RLS** as a backstop (see DATABASE.md), with `app.user_id` set per transaction.
6. **Retrieval**: the workspace filter is injected inside the retriever, not passed by callers, so prompts/clients cannot widen scope. `doc_ids` are intersected with the workspace's documents.

Cross-tenant requests return **404**, not 403, to avoid existence leaks.

## 5. Rate limiting and abuse controls
- Login: 5 attempts / 15 min per (IP, email); exponential delay; generic error messages ("invalid credentials").
- Register: per-IP limit; optional email verification gate before uploads.
- Implemented with Redis counters (sliding window).

## 6. Admin and service accounts
- `is_admin` set only via CLI (`python -m app.cli make-admin <email>`), never via API.
- Worker uses the DB directly with a role limited to needed tables; no user tokens.

## 7. Secrets and key management
- `JWT_SECRET` ≥ 32 random bytes from env; rotation plan: support `kid` header with two active keys.
- Anthropic API key only in API and worker environments; never sent to the frontend.

## 8. Auth test cases (map to TESTING.md)
- Expired/forged/`alg=none` token rejected.
- Refresh reuse detection revokes family.
- User B cannot read, list, search, delete, or cite User A's documents/conversations (every route parametrized).
- Member cannot delete workspace; non-admin gets 403 on `/admin/*`.
- Rate limit triggers on repeated bad logins.
