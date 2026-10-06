import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WorkspaceUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class WorkspaceRead(BaseModel):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    role: str = "member"
    created_at: datetime

    class Config:
        from_attributes = True


class WorkspaceInvite(BaseModel):
    email: EmailStr
    role: str = Field(default="member", pattern="^(owner|member)$")
