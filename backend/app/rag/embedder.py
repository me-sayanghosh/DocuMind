import asyncio
import hashlib
import math
from typing import List, Optional, Protocol

from app.core.config import settings


class Embedder(Protocol):
    dim: int

    async def embed_documents(self, texts: List[str]) -> List[List[float]]: ...

    async def embed_query(self, text: str) -> List[float]: ...


class HashEmbedder:
    """
    Deterministic pseudo-embedding for testing and lightweight environments.
    Produces a normalized 384-dimensional vector based on feature hashing.
    """

    def __init__(self, dim: int = 384):
        self.dim = dim

    def _embed_single(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        words = text.lower().split()
        if not words:
            vec[0] = 1.0
            return vec

        for word in words:
            # Hash to index and sign
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dim
            sign = 1.0 if (h >> 16) & 1 else -1.0
            vec[idx] += sign

        # L2 normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        else:
            vec[0] = 1.0
        return vec

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._embed_single(t) for t in texts]

    async def embed_query(self, text: str) -> List[float]:
        return self._embed_single(text)


class SentenceTransformersEmbedder:
    """
    Real local embedding using sentence-transformers (BAAI/bge-small-en-v1.5).
    Runs off the main asyncio loop.
    """

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5", dim: int = 384):
        self.dim = dim
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.model_name)
        return self._model

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        loop = asyncio.get_running_loop()

        def _run():
            model = self._get_model()
            embeddings = model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()

        return await loop.run_in_executor(None, _run)

    async def embed_query(self, text: str) -> List[float]:
        docs = await self.embed_documents([text])
        return docs[0]


_embedder_instance: Optional[Embedder] = None


def get_embedder() -> Embedder:
    global _embedder_instance
    if _embedder_instance is None:
        if settings.EMBED_PROVIDER in ("sentence_transformers", "local"):
            try:
                _embedder_instance = SentenceTransformersEmbedder(
                    model_name=settings.EMBED_MODEL,
                    dim=settings.EMBED_DIM,
                )
            except Exception:
                # Fallback to hash embedder if dependencies/model missing
                _embedder_instance = HashEmbedder(dim=settings.EMBED_DIM)
        else:
            _embedder_instance = HashEmbedder(dim=settings.EMBED_DIM)
    return _embedder_instance
