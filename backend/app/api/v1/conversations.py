import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import WorkspaceContext, get_current_user, get_workspace_ctx
from app.db.session import async_session_factory, get_db
from app.models.user import User
from app.rag.pipeline import RagPipeline
from app.schemas.conversation import ConversationCreate, ConversationRead, ConversationUpdate
from app.schemas.message import CitationRead, FeedbackRequest, MessageRead, MessageTraceRead, SendMessageRequest
from app.services.conversation_service import conversation_service
from app.services.quota_service import quota_service

router = APIRouter(tags=["conversations"])
pipeline = RagPipeline()


# Workspace-scoped conversation routes
@router.get("/workspaces/{workspace_id}/conversations", response_model=List[ConversationRead])
async def list_conversations(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    convs = await conversation_service.list_conversations(db, workspace_id=ctx.workspace.id)
    return [ConversationRead.model_validate(c) for c in convs]


@router.post(
    "/workspaces/{workspace_id}/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    data: ConversationCreate,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    conv = await conversation_service.create_conversation(
        db=db,
        workspace_id=ctx.workspace.id,
        user_id=ctx.user.id,
        title=data.title,
        doc_ids=data.doc_ids,
    )
    return ConversationRead.model_validate(conv)


# Resource-scoped conversation routes
@router.patch("/conversations/{conversation_id}", response_model=ConversationRead)
async def update_conversation(
    conversation_id: uuid.UUID,
    data: ConversationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await conversation_service.update_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=user.id,
        title=data.title,
        doc_scope=data.doc_scope,
    )
    return ConversationRead.model_validate(conv)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await conversation_service.delete_conversation(db, conversation_id=conversation_id, user_id=user.id)


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageRead])
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msgs = await conversation_service.get_messages(db, conversation_id=conversation_id, user_id=user.id)
    out: List[MessageRead] = []
    for m in msgs:
        citations_read = [
            CitationRead(
                n=c.ordinal,
                document_id=c.document_id,
                filename=c.chunk.document.filename if c.chunk and c.chunk.document else "Document",
                page=c.page,
                chunk_id=c.chunk_id,
                snippet=c.snippet,
                bboxes=c.chunk.bboxes if c.chunk else [],
                rerank_score=c.rerank_score,
            )
            for c in m.citations
        ]
        trace_read = (
            MessageTraceRead.model_validate(m.trace) if m.trace else None
        )
        out.append(
            MessageRead(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                standalone_query=m.standalone_query,
                retrieval_mode=m.retrieval_mode,
                status=m.status,
                feedback=m.feedback,
                citations=citations_read,
                trace=trace_read,
                created_at=m.created_at,
            )
        )
    return out


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: uuid.UUID,
    data: SendMessageRequest,
    user: User = Depends(get_current_user),
):
    # Check rate limit and daily quota
    await quota_service.check_chat_rate_limit(user.id)
    await quota_service.check_daily_quota(user.id)

    async def sse_stream():
        async with async_session_factory() as db:
            conv = await conversation_service.get_conversation(db, conversation_id, user.id)
            async for sse_chunk in pipeline.execute_query(
                db=db,
                conversation=conv,
                user_id=user.id,
                question=data.content,
                mode=data.mode,
                doc_ids=data.doc_ids,
            ):
                yield sse_chunk

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/messages/{message_id}/feedback", status_code=status.HTTP_200_OK)
async def submit_feedback(
    message_id: uuid.UUID,
    data: FeedbackRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    msg = await conversation_service.record_feedback(db, message_id=message_id, user_id=user.id, value=data.value)
    return {"status": "success", "message_id": str(msg.id), "feedback": msg.feedback}


@router.post("/messages/{message_id}/stop", status_code=status.HTTP_200_OK)
async def stop_generation(
    message_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Client abort signal or stop command
    return {"status": "stopped"}
