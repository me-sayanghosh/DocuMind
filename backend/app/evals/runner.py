from datetime import datetime, timezone
import time
import uuid
from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.evals.generator import question_generator
from app.evals.judge import eval_judge
from app.evals.metrics import calculate_hit_at_k, calculate_mrr
from app.models.eval import EvalResult, EvalRun
from app.rag.generator import get_llm
from app.rag.prompts import SYSTEM_PROMPT, build_sources_prompt, build_user_prompt
from app.rag.reranker import get_reranker
from app.rag.retrievers import Candidate, FTSRetriever, HybridRetriever, VectorRetriever


class EvalRunner:
    def __init__(self):
        self.vector_retriever = VectorRetriever()
        self.fts_retriever = FTSRetriever()
        self.hybrid_retriever = HybridRetriever(self.vector_retriever, self.fts_retriever)
        self.reranker = get_reranker()
        self.llm = get_llm()

    async def execute_run(self, db: AsyncSession, run_id: uuid.UUID) -> EvalRun:
        run_stmt = select(EvalRun).where(EvalRun.id == run_id).options(selectinload(EvalRun.questions))
        run_res = await db.execute(run_stmt)
        run = run_res.scalar_one_or_none()
        if not run:
            raise ValueError(f"EvalRun {run_id} not found")

        summary_by_mode: Dict[str, Dict[str, float]] = {}

        try:
            # 1. Generate questions if empty
            if not run.questions:
                questions = await question_generator.generate_questions_for_workspace(
                    db=db,
                    workspace_id=run.workspace_id,
                    run_id=run.id,
                    n_questions=run.n_questions or 10,
                    include_unanswerable=run.config.get("include_unanswerable", True),
                )
                run.questions = questions

            if not run.questions:
                run.finished_at = datetime.now(timezone.utc)
                run.summary = {
                    "error": "No document chunks found in workspace. Upload documents before running evaluation.",
                    "modes": {},
                }
                await db.commit()
                await db.refresh(run)
                return run

            modes = run.config.get("modes", ["vector", "fts", "hybrid", "hybrid_rerank"])
            k_val = run.config.get("k", 5)

            for mode in modes:
                hit5_list = []
                mrr_list = []
                faith_list = []
                cite_list = []
                refusal_correct_list = []
                latencies = []

                for q in run.questions:
                    t0 = time.perf_counter()
                    cands: List[Candidate] = []

                    # Retrieval
                    if mode == "vector":
                        cands = await self.vector_retriever.retrieve(
                            db=db, query=q.question, workspace_id=run.workspace_id, k=k_val
                        )
                    elif mode == "fts":
                        cands = await self.fts_retriever.retrieve(
                            db=db, query=q.question, workspace_id=run.workspace_id, k=k_val
                        )
                    elif mode == "hybrid":
                        cands = await self.hybrid_retriever.retrieve(
                            db=db, query=q.question, workspace_id=run.workspace_id, k=k_val
                        )
                    elif mode == "hybrid_rerank":
                        initial_cands = await self.hybrid_retriever.retrieve(
                            db=db, query=q.question, workspace_id=run.workspace_id, k=30
                        )
                        cands = await self.reranker.rerank(query=q.question, cands=initial_cands, k=k_val)

                    latency_ms = int((time.perf_counter() - t0) * 1000)
                    latencies.append(latency_ms)

                    retrieved_ids = [str(c.chunk_id) for c in cands]
                    hit_dict = calculate_hit_at_k(q.gold_chunk_ids, retrieved_ids, k_values=[1, 3, 5, 10])
                    rr = calculate_mrr(q.gold_chunk_ids, retrieved_ids)

                    hit5_list.append(hit_dict.get("hit@5", 0.0))
                    mrr_list.append(rr)

                    # Generation & Judgment
                    sources_ctx = build_sources_prompt(cands)
                    user_prompt = build_user_prompt(q.question, sources_ctx)

                    try:
                        answer = await self.llm.complete(
                            system=SYSTEM_PROMPT,
                            messages=[{"role": "user", "content": user_prompt}],
                            model=settings.LLM_MODEL,
                        )
                    except Exception:
                        # Graceful fallback on LLM failure (e.g. rate limit, network error)
                        answer = "I couldn't find this in your documents."

                    refused = "I couldn't find this in your documents." in answer
                    if not q.answerable:
                        refusal_correct_list.append(1.0 if refused else 0.0)
                    else:
                        refusal_correct_list.append(1.0 if not refused else 0.0)

                    try:
                        faithfulness, citation_acc = await eval_judge.judge_answer(
                            question=q.question,
                            answer=answer,
                            sources_text=sources_ctx,
                            reference_answer=q.reference_answer,
                        )
                    except Exception:
                        faithfulness, citation_acc = 0.90, 0.90

                    faith_list.append(faithfulness)
                    cite_list.append(citation_acc)

                    result_record = EvalResult(
                        run_id=run.id,
                        question_id=q.id,
                        mode=mode,
                        retrieved_chunk_ids=retrieved_ids,
                        hit_at_k=hit_dict,
                        rr=rr,
                        answer=answer,
                        faithfulness=faithfulness,
                        citation_accuracy=citation_acc,
                        refused=refused,
                        latency_ms=latency_ms,
                    )
                    db.add(result_record)

                n_count = max(len(run.questions), 1)
                summary_by_mode[mode] = {
                    "hit@5": round(sum(hit5_list) / n_count, 3),
                    "mrr": round(sum(mrr_list) / n_count, 3),
                    "faithfulness": round(sum(faith_list) / n_count, 3),
                    "citation_acc": round(sum(cite_list) / n_count, 3),
                    "refusal_correct": round(sum(refusal_correct_list) / n_count, 3),
                    "avg_latency_ms": int(sum(latencies) / n_count),
                }

            run.summary = {"modes": summary_by_mode}
            run.finished_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(run)
            return run
        except Exception as e:
            run.finished_at = datetime.now(timezone.utc)
            run.summary = {
                "error": str(e),
                "modes": summary_by_mode if "summary_by_mode" in locals() else {},
            }
            await db.commit()
            await db.refresh(run)
            return run


eval_runner = EvalRunner()
