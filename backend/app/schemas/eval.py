import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class EvalRunCreate(BaseModel):
    n_questions: int = Field(default=20, ge=1, le=100)
    modes: List[str] = ["vector", "fts", "hybrid", "hybrid_rerank"]
    k: int = Field(default=5, ge=1, le=20)
    include_unanswerable: bool = True


class EvalRunRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_by: uuid.UUID
    config: Dict[str, Any]
    n_questions: int
    created_at: datetime
    finished_at: Optional[datetime] = None
    summary: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class EvalResultRow(BaseModel):
    question: str
    mode: str
    answerable: bool
    refused: bool
    hit: bool
    rr: float
    faithfulness: float
    citation_accuracy: float
    latency_ms: int


class EvalRunDetail(BaseModel):
    run: EvalRunRead
    results: List[Dict[str, Any]] = []
