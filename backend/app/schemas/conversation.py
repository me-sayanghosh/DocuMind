import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"
    doc_ids: Optional[List[uuid.UUID]] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    doc_scope: Optional[List[uuid.UUID]] = None


class ConversationRead(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    title: str
    doc_scope: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
