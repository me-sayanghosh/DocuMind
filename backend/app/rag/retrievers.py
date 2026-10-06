import math
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import Chunk
from app.models.document import Document
from app.rag.embedder import Embedder, get_embedder


@dataclass
class Candidate:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    page: int
    snippet: str
    bboxes: List[Dict[str, Any]] = field(default_factory=list)
    score: float = 0.0
    dense_score: float = 0.0
    fts_score: float = 0.0
    dense_rank: Optional[int] = None
    fts_rank: Optional[int] = None


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


class VectorRetriever:
    def __init__(self, embedder: Optional[Embedder] = None):
        self.embedder = embedder or get_embedder()

    async def retrieve(
        self,
        db: AsyncSession,
        query: str,
        workspace_id: uuid.UUID,
        k: int = 40,
        doc_ids: Optional[List[uuid.UUID]] = None,
    ) -> List[Candidate]:
        qvec = await self.embedder.embed_query(query)
        dialect = db.bind.dialect.name if db.bind else "postgresql"

        candidates: List[Candidate] = []

        if dialect == "postgresql":
            doc_filter = ""
            params: Dict[str, Any] = {
                "ws": str(workspace_id),
                "qvec": str(qvec),
                "k": k,
            }
            if doc_ids:
                doc_filter = "AND c.document_id = ANY(:doc_ids)"
                params["doc_ids"] = [str(d) for d in doc_ids]

            sql = f"""
                SELECT c.id, c.document_id, d.filename, c.page_start, c.text, c.bboxes,
                       1 - (c.embedding <=> :qvec::vector) AS score
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE c.workspace_id = :ws::uuid {doc_filter}
                ORDER BY c.embedding <=> :qvec::vector
                LIMIT :k;
            """
            result = await db.execute(text(sql), params)
            rows = result.fetchall()
            for rank, r in enumerate(rows, start=1):
                candidates.append(
                    Candidate(
                        chunk_id=r[0],
                        document_id=r[1],
                        filename=r[2],
                        page=r[3],
                        snippet=r[4][:300],
                        bboxes=r[5] if isinstance(r[5], list) else [],
                        score=float(r[6]) if r[6] is not None else 0.0,
                        dense_score=float(r[6]) if r[6] is not None else 0.0,
                        dense_rank=rank,
                    )
                )
        else:
            # Fallback for SQLite / test mode: load chunks in workspace and compute cosine sim
            stmt = select(Chunk, Document.filename).join(Document, Chunk.document_id == Document.id).where(Chunk.workspace_id == workspace_id)
            if doc_ids:
                stmt = stmt.where(Chunk.document_id.in_(doc_ids))
            result = await db.execute(stmt)
            scored = []
            for chunk, filename in result.all():
                if chunk.embedding:
                    emb = chunk.embedding if isinstance(chunk.embedding, list) else []
                    sim = cosine_similarity(qvec, emb)
                    scored.append((sim, chunk, filename))
            scored.sort(key=lambda x: x[0], reverse=True)
            for rank, (sim, c, fname) in enumerate(scored[:k], start=1):
                candidates.append(
                    Candidate(
                        chunk_id=c.id,
                        document_id=c.document_id,
                        filename=fname,
                        page=c.page_start,
                        snippet=c.text[:300],
                        bboxes=c.bboxes or [],
                        score=float(sim),
                        dense_score=float(sim),
                        dense_rank=rank,
                    )
                )

        return candidates


class FTSRetriever:
    async def retrieve(
        self,
        db: AsyncSession,
        query: str,
        workspace_id: uuid.UUID,
        k: int = 40,
        doc_ids: Optional[List[uuid.UUID]] = None,
    ) -> List[Candidate]:
        dialect = db.bind.dialect.name if db.bind else "postgresql"
        candidates: List[Candidate] = []

        if dialect == "postgresql":
            doc_filter = ""
            params: Dict[str, Any] = {
                "ws": str(workspace_id),
                "query": query,
                "k": k,
            }
            if doc_ids:
                doc_filter = "AND c.document_id = ANY(:doc_ids)"
                params["doc_ids"] = [str(d) for d in doc_ids]

            sql = f"""
                SELECT c.id, c.document_id, d.filename, c.page_start, c.text, c.bboxes,
                       ts_rank_cd(c.tsv, websearch_to_tsquery('english', :query)) AS score
                FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE c.workspace_id = :ws::uuid
                  AND c.tsv @@ websearch_to_tsquery('english', :query)
                  {doc_filter}
                ORDER BY score DESC
                LIMIT :k;
            """
            result = await db.execute(text(sql), params)
            rows = result.fetchall()
            for rank, r in enumerate(rows, start=1):
                candidates.append(
                    Candidate(
                        chunk_id=r[0],
                        document_id=r[1],
                        filename=r[2],
                        page=r[3],
                        snippet=r[4][:300],
                        bboxes=r[5] if isinstance(r[5], list) else [],
                        score=float(r[6]) if r[6] is not None else 0.0,
                        fts_score=float(r[6]) if r[6] is not None else 0.0,
                        fts_rank=rank,
                    )
                )
        else:
            # Fallback for SQLite / testing: keyword substring match score
            words = [w.lower() for w in query.split() if len(w) > 2]
            stmt = select(Chunk, Document.filename).join(Document, Chunk.document_id == Document.id).where(Chunk.workspace_id == workspace_id)
            if doc_ids:
                stmt = stmt.where(Chunk.document_id.in_(doc_ids))
            result = await db.execute(stmt)

            scored = []
            for chunk, fname in result.all():
                text_lower = chunk.text.lower()
                matches = sum(1 for w in words if w in text_lower)
                if matches > 0 or not words:
                    score = float(matches) / max(len(words), 1)
                    scored.append((score, chunk, fname))

            scored.sort(key=lambda x: x[0], reverse=True)
            for rank, (score, c, fname) in enumerate(scored[:k], start=1):
                candidates.append(
                    Candidate(
                        chunk_id=c.id,
                        document_id=c.document_id,
                        filename=fname,
                        page=c.page_start,
                        snippet=c.text[:300],
                        bboxes=c.bboxes or [],
                        score=score,
                        fts_score=score,
                        fts_rank=rank,
                    )
                )

        return candidates


class HybridRetriever:
    def __init__(self, vector_retriever: Optional[VectorRetriever] = None, fts_retriever: Optional[FTSRetriever] = None):
        self.vector_retriever = vector_retriever or VectorRetriever()
        self.fts_retriever = fts_retriever or FTSRetriever()

    async def retrieve(
        self,
        db: AsyncSession,
        query: str,
        workspace_id: uuid.UUID,
        k: int = 30,
        doc_ids: Optional[List[uuid.UUID]] = None,
        rrf_k: int = 60,
    ) -> List[Candidate]:
        dense_cands = await self.vector_retriever.retrieve(
            db=db, query=query, workspace_id=workspace_id, k=40, doc_ids=doc_ids
        )
        fts_cands = await self.fts_retriever.retrieve(
            db=db, query=query, workspace_id=workspace_id, k=40, doc_ids=doc_ids
        )

        fused: Dict[uuid.UUID, Candidate] = {}
        rrf_scores: Dict[uuid.UUID, float] = {}

        # Add dense ranks
        for rank, cand in enumerate(dense_cands, start=1):
            cand.dense_rank = rank
            fused[cand.chunk_id] = cand
            rrf_scores[cand.chunk_id] = rrf_scores.get(cand.chunk_id, 0.0) + (1.0 / (rrf_k + rank))

        # Add FTS ranks
        for rank, cand in enumerate(fts_cands, start=1):
            cand.fts_rank = rank
            if cand.chunk_id in fused:
                fused[cand.chunk_id].fts_score = cand.fts_score
                fused[cand.chunk_id].fts_rank = rank
            else:
                fused[cand.chunk_id] = cand
            rrf_scores[cand.chunk_id] = rrf_scores.get(cand.chunk_id, 0.0) + (1.0 / (rrf_k + rank))

        # Assign combined RRF score and sort
        for chunk_id, cand in fused.items():
            cand.score = rrf_scores[chunk_id]

        sorted_candidates = sorted(fused.values(), key=lambda c: c.score, reverse=True)
        return sorted_candidates[:k]
