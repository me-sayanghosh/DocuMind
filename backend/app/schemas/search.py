import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    mode: str = "hybrid_rerank"  # 'vector', 'fts', 'hybrid', 'hybrid_rerank'
    k: int = Field(default=6, ge=1, le=50)
    doc_ids: Optional[List[uuid.UUID]] = None


class SearchCandidateRead(BaseModel):
    n: int
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    page: int
    snippet: str
    score: float
    bboxes: List[Dict[str, Any]] = []


class SearchResponse(BaseModel):
    query: str
    mode: str
    candidates: List[SearchCandidateRead]
