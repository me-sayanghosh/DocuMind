# PRD — DocChat RAG

## 1. Summary
A multi-tenant web app where users upload PDFs into private workspaces and chat with them. Every answer carries citations that jump to the exact page and highlighted passage. Retrieval quality is **measured**, not assumed, via a built-in evaluation harness.

## 2. Problem
Professionals (students, analysts, legal/ops staff) need answers from long PDFs. Generic chatbots hallucinate, don't cite verifiably, and mix data across users. Typical RAG demos use vector-only search, which misses exact terms (names, IDs, clause numbers), and never prove quality.

## 3. Target users
| Persona | Need |
|---|---|
| Researcher/student | Ask questions across papers, verify sources fast |
| Analyst/ops | Pull specific clauses and figures from contracts and reports |
| Hiring reviewer / dev (secondary) | Evaluate the engineering quality of the project |

## 4. Goals
1. Accurate, grounded answers with click-through citations.
2. Strict per-user/workspace data isolation.
3. Demonstrable retrieval quality gains (hybrid + rerank vs vector-only).
4. Production-grade basics: async ingestion, status, limits, observability.

## 5. Non-goals (v1)
- OCR for scanned PDFs (stretch), non-PDF formats, real-time collaboration, mobile apps, billing/payments, fine-tuning models.

## 6. Key features
| ID | Feature | Priority |
|---|---|---|
| F1 | Register/login, workspaces | P0 |
| F2 | PDF upload, dedupe, ingestion status | P0 |
| F3 | Chat with streaming answers | P0 |
| F4 | Citations to page + highlighted chunk | P0 |
| F5 | Hybrid search (vector + FTS + RRF) + rerank | P0 |
| F6 | "Not found in your documents" behavior | P0 |
| F7 | Follow-up question rewriting / conversation memory | P1 |
| F8 | Evaluation harness + results dashboard | P0 (differentiator) |
| F9 | Rate limits and usage quotas | P1 |
| F10 | Admin latency/usage view | P2 |
| F11 | Document delete with full vector cleanup | P0 |
| F12 | Workspace sharing/invites | P2 |

## 7. User stories
- As a user, I upload a PDF and see progress until it's ready, so I know when I can ask questions.
- As a user, I ask a question and see a streamed answer with numbered citations; clicking one opens the PDF at that page with the passage highlighted.
- As a user, if the answer isn't in my documents, the app says so instead of guessing.
- As a user, I can scope a chat to one document or the whole workspace.
- As an owner, I can delete a document and know its data is gone.
- As a developer, I run `make eval` and get retrieval/faithfulness/citation scores per retrieval strategy.

## 8. Success metrics
| Metric | Target |
|---|---|
| hit@5 (hybrid+rerank) on eval set | ≥ 85%, ≥ +10 pts over vector-only |
| Faithfulness (LLM-judge) | ≥ 90% |
| Citation accuracy (cited chunk supports claim) | ≥ 90% |
| Ingestion of 100-page PDF | < 60 s p95 |
| Time to first token | < 2.5 s p95 |
| Cross-tenant leakage in tests | 0 |

## 9. Constraints and assumptions
- Solo developer, ~3 weeks plus 1 week docs/scaffold.
- Low-cost hosting; local embedding/reranker models to avoid per-call fees.
- Claude API for generation (model name configurable by env var).

## 10. Release plan
- v0.1 (end Week 1): backend pipeline via API.
- v0.5 (end Week 2): hybrid, streaming, citations.
- v1.0 (end Week 3): UI, eval results, deployed, README with numbers.

## 11. Open questions
- Chunk size/overlap defaults (to be settled by eval ablation).
- Hosted vs local embeddings in production (cost vs RAM on the free tier).
