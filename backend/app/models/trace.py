import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QueryTrace(Base):
    __tablename__ = "query_traces"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    rewrite_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dense_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fts_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fuse_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rerank_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_token_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    candidates: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    top_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    cache_hit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    message = relationship("Message", back_populates="trace")
