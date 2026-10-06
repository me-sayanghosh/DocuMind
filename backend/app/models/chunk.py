import uuid
from datetime import datetime, timezone
from typing import Any, List
from sqlalchemy import DateTime, ForeignKey, Index, Integer, Text, JSON
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.custom_types import CompatibleVector


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_start: Mapped[int] = mapped_column(Integer, nullable=False)
    page_end: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    bboxes: Mapped[List[dict]] = mapped_column(JSON, default=list, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    embedding: Mapped[Any] = mapped_column(CompatibleVector(384), nullable=True)

    # In PostgreSQL, tsv is tsvector; we map it with custom type or nullable Text for universal compatibility
    tsv: Mapped[Any] = mapped_column(
        TSVECTOR().with_variant(Text, "sqlite"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("chunks_doc_idx", "document_id", "chunk_index"),
        Index("chunks_ws_idx", "workspace_id"),
    )

    document = relationship("Document", back_populates="chunks")
