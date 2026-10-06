import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CitationRead(BaseModel):
    n: int
    document_id: uuid.UUID
    filename: str
    page: int
    chunk_id: Optional[uuid.UUID] = None
    snippet: str
    bboxes: List[Dict[str, Any]] = []
    rerank_score: float = 0.0


class MessageTraceRead(BaseModel):
    rewrite_ms: int = 0
    dense_ms: int = 0
    fts_ms: int = 0
    fuse_ms: int = 0
    rerank_ms: int = 0
    first_token_ms: int = 0
    total_ms: int = 0
    candidates: int = 0
    top_score: float = 0.0
    cache_hit: bool = False

    class Config:
        from_attributes = True


class MessageRead(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    standalone_query: Optional[str] = None
    retrieval_mode: Optional[str] = None
    status: str
    feedback: Optional[int] = None
    citations: List[CitationRead] = []
    trace: Optional[MessageTraceRead] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str = Field(..., max_length=4000)
    mode: str = "hybrid_rerank"  # 'vector', 'fts', 'hybrid', 'hybrid_rerank'
    doc_ids: Optional[List[uuid.UUID]] = None


class FeedbackRequest(BaseModel):
    value: int = Field(..., ge=-1, le=1)  # 1 or -1
