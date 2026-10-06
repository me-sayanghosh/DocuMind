from __future__ import annotations

import asyncio
import re
from typing import List, Optional, Protocol, Tuple
from app.core.config import settings
from app.rag.retrievers import Candidate


class Reranker(Protocol):
    async def rerank(self, query: str, cands: List[Candidate], k: int = 6) -> List[Candidate]:
        ...


class HeuristicReranker:
    """
    Fallback reranker when CrossEncoder weights/torch are not available.
    Blends lexical overlap, phrase matching, and original retriever score.
    """

    async def rerank(self, query: str, cands: List[Candidate], k: int = 6) -> List[Candidate]:
        if not cands:
            return []

        query_terms = [w.lower() for w in re.findall(r"\w+", query) if len(w) > 2]
        query_lower = query.lower().strip()

        scored: List[tuple[float, Candidate]] = []
        for cand in cands:
            text_lower = cand.snippet.lower()
            term_matches = sum(1 for term in query_terms if term in text_lower)
            term_score = term_matches / max(len(query_terms), 1)

            exact_phrase_bonus = 0.2 if query_lower in text_lower else 0.0

            # Base score normalized
            base_score = min(max(cand.score, 0.0), 1.0)

            # Combined rerank score: 0.5 base + 0.4 term match + 0.1 exact phrase
            final_score = (0.5 * base_score) + (0.4 * term_score) + exact_phrase_bonus
            cand.score = round(final_score, 4)
            scored.append((final_score, cand))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:k]]


class CrossEncoderReranker:
    """
    Local CrossEncoder reranker using sentence-transformers CrossEncoder.
    """

    def __init__(self, model_name: str = "BAAI/bge-reranker-base"):
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(self.model_name)
        return self._model

    async def rerank(self, query: str, cands: List[Candidate], k: int = 6) -> List[Candidate]:
        if not cands:
            return []

        loop = asyncio.get_running_loop()

        def _run():
            model = self._get_model()
            pairs = [[query, c.snippet] for c in cands]
            scores = model.predict(pairs)
            return scores.tolist() if hasattr(scores, "tolist") else list(scores)

        scores = await loop.run_in_executor(None, _run)

        scored: List[tuple[float, Candidate]] = []
        for cand, score in zip(cands, scores):
            # Sigmoid normalization if scores are logits
            norm_score = 1.0 / (1.0 + (2.71828 ** (-float(score))))
            cand.score = round(norm_score, 4)
            scored.append((cand.score, cand))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:k]]


_reranker_instance: Reranker | None = None


def get_reranker() -> Reranker:
    global _reranker_instance
    if _reranker_instance is None:
        if settings.EMBED_PROVIDER in ("sentence_transformers", "local"):
            try:
                _reranker_instance = CrossEncoderReranker(model_name=settings.RERANK_MODEL)
            except Exception:
                _reranker_instance = HeuristicReranker()
        else:
            _reranker_instance = HeuristicReranker()
    return _reranker_instance
