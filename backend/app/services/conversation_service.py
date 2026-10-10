import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundException
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.message import Message, MessageCitation
from app.models.workspace import WorkspaceMember


class ConversationService:
    async def create_conversation(
        self,
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        title: Optional[str] = "New Chat",
        doc_ids: Optional[List[uuid.UUID]] = None,
    ) -> Conversation:
        conv = Conversation(
            workspace_id=workspace_id,
            user_id=user_id,
            title=title or "New Chat",
            doc_scope=[str(d) for d in doc_ids] if doc_ids else None,
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    async def list_conversations(
        self, db: AsyncSession, workspace_id: uuid.UUID
    ) -> List[Conversation]:
        stmt = (
            select(Conversation)
            .where(Conversation.workspace_id == workspace_id)
            .order_by(Conversation.updated_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_conversation(
        self, db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> Conversation:
        stmt = (
            select(Conversation)
            .join(WorkspaceMember, Conversation.workspace_id == WorkspaceMember.workspace_id)
            .where(Conversation.id == conversation_id, WorkspaceMember.user_id == user_id)
        )
        res = await db.execute(stmt)
        conv = res.scalar_one_or_none()
        if not conv:
            raise NotFoundException("Conversation not found")
        return conv

    async def update_conversation(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        title: Optional[str] = None,
        doc_scope: Optional[List[uuid.UUID]] = None,
    ) -> Conversation:
        conv = await self.get_conversation(db, conversation_id, user_id)
        if title is not None:
            conv.title = title
        if doc_scope is not None:
            conv.doc_scope = [str(d) for d in doc_scope] if doc_scope else None
        await db.commit()
        await db.refresh(conv)
        return conv

    async def delete_conversation(
        self, db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        conv = await self.get_conversation(db, conversation_id, user_id)
        await db.delete(conv)
        await db.commit()

    async def get_messages(
        self, db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> List[Message]:
        await self.get_conversation(db, conversation_id, user_id)
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .options(
                selectinload(Message.citations)
                .selectinload(MessageCitation.chunk)
                .selectinload(Chunk.document),
                selectinload(Message.trace),
            )
            .order_by(Message.created_at.asc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def record_feedback(
        self, db: AsyncSession, message_id: uuid.UUID, user_id: uuid.UUID, value: int
    ) -> Message:
        stmt = (
            select(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .join(WorkspaceMember, Conversation.workspace_id == WorkspaceMember.workspace_id)
            .where(Message.id == message_id, WorkspaceMember.user_id == user_id)
        )
        res = await db.execute(stmt)
        msg = res.scalar_one_or_none()
        if not msg:
            raise NotFoundException("Message not found")

        msg.feedback = value
        await db.commit()
        await db.refresh(msg)
        return msg


conversation_service = ConversationService()
