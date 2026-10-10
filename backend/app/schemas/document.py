import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    id: uuid.UUID
    filename: str
    status: str
    page_count: int
    chunks_done: int
    chunks_total: int
    size_bytes: int
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    document: DocumentRead
    duplicate: bool = False


class DocumentEvent(BaseModel):
    status: str
    chunks_done: int
    chunks_total: int
    error: Optional[str] = None
