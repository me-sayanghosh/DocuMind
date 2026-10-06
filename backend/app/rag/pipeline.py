import json
import re
import time
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.message import Message, MessageCitation
from app.models.trace import QueryTrace
from app.models.usage import UsageEvent
from app.rag.generator import LLM, get_llm
from app.rag.prompts import (
    REWRITE_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
    build_sources_prompt,
    build_user_prompt,
)
from app.rag.reranker import Reranker, get_reranker
from app.rag.retrievers import (
    Candidate,
    FTSRetriever,
    HybridRetriever,
    VectorRetriever,
)


def format_sse(event: str, data: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def parse_citation_ordinals(text: str) -> List[int]:
    matches = re.findall(r"\[(\d+)\]", text)
    ordinals = []
    seen = set()
    for m in matches:
        val = int(m)
        if val not in seen:
            seen.add(val)
            ordinals.append(val)
    return ordinals


class RagPipeline:
    def __init__(
        self,
        vector_retriever: Optional[VectorRetriever] = None,
        fts_retriever: Optional[FTSRetriever] = None,
        hybrid_retriever: Optional[HybridRetriever] = None,
        reranker: Optional[Reranker] = None,
        llm: Optional[LLM] = None,
    ):
        self.vector_retriever = vector_retriever or VectorRetriever()
        self.fts_retriever = fts_retriever or FTSRetriever()
        self.hybrid_retriever = hybrid_retriever or HybridRetriever(
            vector_retriever=self.vector_retriever,
            fts_retriever=self.fts_retriever,
        )
        self.reranker = reranker or get_reranker()
        self.llm = llm or get_llm()

    async def execute_query(
        self,
        db: AsyncSession,
        conversation: Conversation,
        user_id: uuid.UUID,
        question: str,
        mode: str = "hybrid_rerank",
        doc_ids: Optional[List[uuid.UUID]] = None,
        abort_signal: Optional[Any] = None,
    ) -> AsyncIterator[str]:
        start_total = time.perf_counter()
        timings = {
            "rewrite_ms": 0,
            "dense_ms": 0,
            "fts_ms": 0,
            "fuse_ms": 0,
            "rerank_ms": 0,
            "first_token_ms": 0,
            "total_ms": 0,
        }

        # 1. Fetch conversation history
        history_stmt = (
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .limit(6)
        )
        history_res = await db.execute(history_stmt)
        past_messages = list(reversed(history_res.scalars().all()))

        # 2. Query Rewriting (if conversation has turns)
        standalone_query = question
        if past_messages:
            yield format_sse("status", {"stage": "rewriting"})
            t_rewrite = time.perf_counter()
            history_context = "\n".join(
                f"{m.role.capitalize()}: {m.content}" for m in past_messages[-4:]
            )
            rewrite_prompt = (
                f"Conversation History:\n{history_context}\n\nFollow-up question: {question}"
            )
            try:
                rewritten = await self.llm.complete(
                    system=REWRITE_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": rewrite_prompt}],
                    model=settings.LLM_FAST_MODEL,
                )
                if rewritten and len(rewritten.strip()) > 2:
                    standalone_query = rewritten.strip()
                    yield format_sse("rewrite", {"standalone_query": standalone_query})
            except Exception:
                standalone_query = question
            timings["rewrite_ms"] = int((time.perf_counter() - t_rewrite) * 1000)

        # 3. Retrieval
        yield format_sse("status", {"stage": "retrieving"})
        t_ret = time.perf_counter()
        candidates: List[Candidate] = []

        workspace_id = conversation.workspace_id
        target_docs = doc_ids or (
            [uuid.UUID(d) for d in conversation.doc_scope] if conversation.doc_scope else None
        )

        if mode == "vector":
            candidates = await self.vector_retriever.retrieve(
                db=db,
                query=standalone_query,
                workspace_id=workspace_id,
                k=40,
                doc_ids=target_docs,
            )
            timings["dense_ms"] = int((time.perf_counter() - t_ret) * 1000)
        elif mode == "fts":
            candidates = await self.fts_retriever.retrieve(
                db=db,
                query=standalone_query,
                workspace_id=workspace_id,
                k=40,
                doc_ids=target_docs,
            )
            timings["fts_ms"] = int((time.perf_counter() - t_ret) * 1000)
        else:
            # hybrid or hybrid_rerank
            candidates = await self.hybrid_retriever.retrieve(
                db=db,
                query=standalone_query,
                workspace_id=workspace_id,
                k=30,
                doc_ids=target_docs,
            )
            timings["fuse_ms"] = int((time.perf_counter() - t_ret) * 1000)

        # 4. Reranking
        top_score = 0.0
        if mode == "hybrid_rerank" and candidates:
            yield format_sse("status", {"stage": "reranking"})
            t_rerank = time.perf_counter()
            candidates = await self.reranker.rerank(
                query=standalone_query,
                cands=candidates,
                k=6,
            )
            timings["rerank_ms"] = int((time.perf_counter() - t_rerank) * 1000)
        else:
            candidates = candidates[:6]

        if candidates:
            top_score = candidates[0].score

        # 5. Emit sources event
        sources_items = [
            {
                "n": idx,
                "document_id": str(c.document_id),
                "filename": c.filename,
                "page": c.page,
                "chunk_id": str(c.chunk_id),
                "snippet": c.snippet,
                "score": round(c.score, 4),
            }
            for idx, c in enumerate(candidates, start=1)
        ]
        yield format_sse("sources", {"items": sources_items})

        # Save User Message to DB
        user_msg = Message(
            conversation_id=conversation.id,
            role="user",
            content=question,
            standalone_query=standalone_query if standalone_query != question else None,
            retrieval_mode=mode,
            status="complete",
        )
        db.add(user_msg)
        await db.commit()
        await db.refresh(user_msg)

        # 6. Relevance Threshold Gate (Refusal Path)
        refusal_threshold = settings.RELEVANCE_THRESHOLD
        is_refusal = (not candidates) or (top_score < refusal_threshold)

        assistant_msg_id = uuid.uuid4()
        accumulated_text = ""
        final_status = "complete"

        if is_refusal:
            refusal_text = "I couldn't find this in your documents."
            yield format_sse("status", {"stage": "generating"})
            yield format_sse("token", {"text": refusal_text})
            yield format_sse("citations", {"items": []})

            timings["total_ms"] = int((time.perf_counter() - start_total) * 1000)
            yield format_sse(
                "done",
                {
                    "message_id": str(assistant_msg_id),
                    "status": "refused",
                    "timings": timings,
                },
            )

            # Persist assistant refusal message
            assistant_msg = Message(
                id=assistant_msg_id,
                conversation_id=conversation.id,
                role="assistant",
                content=refusal_text,
                retrieval_mode=mode,
                status="refused",
            )
            db.add(assistant_msg)

            trace = QueryTrace(
                message_id=assistant_msg_id,
                workspace_id=workspace_id,
                rewrite_ms=timings["rewrite_ms"],
                dense_ms=timings["dense_ms"],
                fts_ms=timings["fts_ms"],
                fuse_ms=timings["fuse_ms"],
                rerank_ms=timings["rerank_ms"],
                first_token_ms=0,
                total_ms=timings["total_ms"],
                candidates=len(candidates),
                top_score=top_score,
                cache_hit=False,
            )
            db.add(trace)
            await db.commit()
            return

        # 7. Generation (Streaming Answer)
        yield format_sse("status", {"stage": "generating"})
        sources_context = build_sources_prompt(candidates)
        user_prompt = build_user_prompt(question=standalone_query, sources_context=sources_context)

        llm_messages = [{"role": "user", "content": user_prompt}]

        t_gen_start = time.perf_counter()
        first_token = True

        try:
            async for token in self.llm.stream(
                system=SYSTEM_PROMPT,
                messages=llm_messages,
                model=settings.LLM_MODEL,
            ):
                if first_token:
                    timings["first_token_ms"] = int((time.perf_counter() - t_gen_start) * 1000)
                    first_token = False

                accumulated_text += token
                yield format_sse("token", {"text": token})
        except Exception as e:
            final_status = "error"
            yield format_sse("error", {"code": "LLM_ERROR", "message": str(e)})

        # 8. Parse citations from generated text
        cited_ordinals = parse_citation_ordinals(accumulated_text)
        citations_items = []
        db_citations = []

        candidate_by_n = {idx: c for idx, c in enumerate(candidates, start=1)}

        for ord_num in cited_ordinals:
            if ord_num in candidate_by_n:
                c = candidate_by_n[ord_num]
                c_item = {
                    "n": ord_num,
                    "document_id": str(c.document_id),
                    "filename": c.filename,
                    "page": c.page,
                    "chunk_id": str(c.chunk_id),
                    "bboxes": c.bboxes,
                    "snippet": c.snippet,
                }
                citations_items.append(c_item)

                db_citations.append(
                    MessageCitation(
                        message_id=assistant_msg_id,
                        ordinal=ord_num,
                        chunk_id=c.chunk_id,
                        document_id=c.document_id,
                        page=c.page,
                        snippet=c.snippet,
                        rerank_score=c.score,
                    )
                )

        yield format_sse("citations", {"items": citations_items})

        timings["total_ms"] = int((time.perf_counter() - start_total) * 1000)
        yield format_sse(
            "done",
            {
                "message_id": str(assistant_msg_id),
                "status": final_status,
                "timings": timings,
            },
        )

        # 9. Persist Assistant Message, Citations, and Trace
        assistant_msg = Message(
            id=assistant_msg_id,
            conversation_id=conversation.id,
            role="assistant",
            content=accumulated_text,
            retrieval_mode=mode,
            status=final_status,
            tokens_in=len(user_prompt) // 4,
            tokens_out=len(accumulated_text) // 4,
        )
        db.add(assistant_msg)
        for dc in db_citations:
            db.add(dc)

        trace = QueryTrace(
            message_id=assistant_msg_id,
            workspace_id=workspace_id,
            rewrite_ms=timings["rewrite_ms"],
            dense_ms=timings["dense_ms"],
            fts_ms=timings["fts_ms"],
            fuse_ms=timings["fuse_ms"],
            rerank_ms=timings["rerank_ms"],
            first_token_ms=timings["first_token_ms"],
            total_ms=timings["total_ms"],
            candidates=len(candidates),
            top_score=top_score,
            cache_hit=False,
        )
        db.add(trace)

        usage = UsageEvent(
            user_id=user_id,
            workspace_id=workspace_id,
            kind="query",
            tokens_in=assistant_msg.tokens_in,
            tokens_out=assistant_msg.tokens_out,
        )
        db.add(usage)
        await db.commit()
