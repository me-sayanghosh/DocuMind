# DATABASE

PostgreSQL 16 + `pgvector` + `pg_trgm` (optional) + `pgcrypto`/`uuid-ossp` (or `gen_random_uuid()`). All PKs are UUIDs; all timestamps `timestamptz`.

## 1. ER overview

```
users ─┬─< workspace_members >─┬─ workspaces
       │                        ├─< documents ─< chunks
       │                        ├─< conversations ─< messages ─< message_citations >─ chunks
       │                        └─< eval_runs ─< eval_results
       └─< refresh_tokens        usage_events (user, workspace)
```

## 2. Tables

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | citext UNIQUE | lowercased |
| password_hash | text | argon2id |
| is_active | bool | default true |
| is_admin | bool | default false |
| created_at | timestamptz | |

### workspaces
| id uuid PK | name text | owner_id → users | created_at |

### workspace_members
| workspace_id → workspaces | user_id → users | role text (`owner`/`member`) | PK(workspace_id, user_id) |

### refresh_tokens
| id uuid PK | user_id | token_hash text UNIQUE | expires_at | revoked_at | user_agent | created_at |

### documents
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | uuid FK ON DELETE CASCADE | indexed |
| uploaded_by | uuid FK users | |
| filename | text | display only; sanitized |
| storage_key | text | path/key in object store |
| sha256 | char(64) | UNIQUE(workspace_id, sha256) |
| size_bytes | int | |
| page_count | int | |
| status | text | `queued`/`processing`/`ready`/`failed` (CHECK) |
| error | text | nullable |
| chunks_total / chunks_done | int | progress |
| created_at / updated_at | timestamptz | |

### chunks
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| document_id | uuid FK ON DELETE CASCADE | |
| workspace_id | uuid | denormalized for fast filtered search; same cascade |
| chunk_index | int | order within doc |
| page_start / page_end | int | |
| text | text | |
| bboxes | jsonb | `[{page, x0,y0,x1,y1}, ...]` in PDF points |
| token_count | int | |
| embedding | vector(384) | dimension from config |
| tsv | tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED | |
| created_at | timestamptz | |

### conversations
| id | workspace_id | user_id | title | doc_scope uuid[] NULL | created_at | updated_at |

### messages
| id | conversation_id FK CASCADE | role (`user`/`assistant`) | content text | standalone_query text NULL | retrieval_mode text | status (`complete`/`refused`/`error`/`stopped`) | feedback smallint NULL | tokens_in/out int | created_at |

### message_citations
| message_id FK CASCADE | ordinal int | chunk_id FK ON DELETE SET NULL | document_id | page int | snippet text | rerank_score real | PK(message_id, ordinal) |

Keeping `page` and `snippet` denormalized preserves history even if a chunk is re-ingested.

### query_traces
| id | message_id | rewrite_ms | dense_ms | fts_ms | fuse_ms | rerank_ms | first_token_ms | total_ms | candidates int | top_score real | cache_hit bool | created_at |

### usage_events
| id | user_id | workspace_id | kind (`query`/`upload`/`eval`) | tokens_in | tokens_out | created_at |

### eval_runs / eval_results
- `eval_runs`: id, workspace_id, created_by, config jsonb (chunk params, k, models), n_questions, created_at, finished_at, summary jsonb.
- `eval_questions`: id, run_id (or dataset_id), question, gold_chunk_ids uuid[], reference_answer, answerable bool.
- `eval_results`: id, run_id, question_id, mode text, retrieved_chunk_ids uuid[], hit_at_k jsonb, rr real, answer text, faithfulness real, citation_accuracy real, refused bool, latency_ms int.

## 3. Indexes

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE INDEX chunks_embedding_hnsw ON chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX chunks_tsv_gin   ON chunks USING gin (tsv);
CREATE INDEX chunks_ws_idx    ON chunks (workspace_id);
CREATE INDEX chunks_doc_idx   ON chunks (document_id, chunk_index);
CREATE UNIQUE INDEX documents_ws_hash ON documents (workspace_id, sha256);
CREATE INDEX documents_ws_status ON documents (workspace_id, status);
CREATE INDEX messages_conv_idx ON messages (conversation_id, created_at);
```
Query-time: `SET LOCAL hnsw.ef_search = 100;` and, on pgvector ≥ 0.8, `SET LOCAL hnsw.iterative_scan = relaxed_order;` so workspace-filtered ANN does not return too few rows.

## 4. Core queries

Dense:
```sql
SELECT id, 1 - (embedding <=> :qvec) AS score
FROM chunks
WHERE workspace_id = :ws AND (:doc_ids IS NULL OR document_id = ANY(:doc_ids))
ORDER BY embedding <=> :qvec
LIMIT 40;
```
Lexical:
```sql
SELECT id, ts_rank_cd(tsv, q) AS score
FROM chunks, websearch_to_tsquery('english', :query) q
WHERE workspace_id = :ws AND tsv @@ q
  AND (:doc_ids IS NULL OR document_id = ANY(:doc_ids))
ORDER BY score DESC
LIMIT 40;
```
RRF is computed in Python: `score(d) = Σ 1 / (60 + rank_i(d))`.

## 5. Row-level security (defense in depth)
Enable RLS on `documents`, `chunks`, `conversations`, `messages` with policy `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = current_setting('app.user_id')::uuid)`. API sets `SET LOCAL app.user_id` per transaction. App-level filtering stays primary; RLS is the safety net (and test target).

## 6. Migrations
- Alembic, one revision per change, autogenerate then hand-review (vector/generated columns need manual DDL).
- Migration `0001`: extensions + users/workspaces. `0002`: documents/chunks/indexes. `0003`: chat tables. `0004`: eval + traces + usage.
- Changing embedding dimension = new migration + full re-embed job.
- CI runs `alembic upgrade head` on a fresh pgvector container and `alembic downgrade base` check.

## 7. Retention and deletion
- Deleting a document: DB cascade removes chunks; worker/API deletes the stored file; citations keep denormalized snippet (nullable chunk_id) — or purge on request.
- Deleting a workspace/user: cascade everything, revoke tokens, remove stored files.
- Old `query_traces`/`usage_events` pruned by scheduled job (90 days).
