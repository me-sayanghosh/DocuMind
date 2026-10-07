import asyncio
import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import WorkspaceContext, get_workspace_ctx
from app.db.session import async_session_factory, get_db
from app.schemas.document import DocumentRead, DocumentUploadResponse
from app.services.document_service import document_service
from app.services.storage_service import storage_service
from app.worker.tasks import enqueue_document_ingestion

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["documents"])


@router.post("", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
    response: Response = None,
):
    content = await file.read()
    filename = file.filename or "uploaded.pdf"

    doc, is_duplicate = await document_service.upload_document(
        db=db,
        workspace_id=ctx.workspace.id,
        uploaded_by=ctx.user.id,
        filename=filename,
        content=content,
    )

    if is_duplicate:
        if response:
            response.status_code = status.HTTP_200_OK
    else:
        if response:
            response.status_code = status.HTTP_202_ACCEPTED
        # Enqueue background ingestion
        await enqueue_document_ingestion(doc.id)

    return DocumentUploadResponse(
        document=DocumentRead.model_validate(doc),
        duplicate=is_duplicate,
    )


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    docs = await document_service.list_documents(db, workspace_id=ctx.workspace.id)
    return [DocumentRead.model_validate(d) for d in docs]


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.get_document(db, workspace_id=ctx.workspace.id, document_id=document_id)
    return DocumentRead.model_validate(doc)


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.get_document(db, workspace_id=ctx.workspace.id, document_id=document_id)
    content = await storage_service.read_file(doc.storage_key)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'},
    )


@router.get("/{document_id}/events")
async def get_document_events(
    document_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
):
    """SSE endpoint streaming document ingestion status until terminal state."""
    async def event_generator():
        while True:
            async with async_session_factory() as db:
                doc = await document_service.get_document(db, workspace_id=ctx.workspace.id, document_id=document_id)
                data = {
                    "status": doc.status,
                    "chunks_done": doc.chunks_done,
                    "chunks_total": doc.chunks_total,
                    "error": doc.error,
                }
                yield f"data: {json.dumps(data)}\n\n"
                if doc.status in ("ready", "failed"):
                    break
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/{document_id}/reingest", response_model=DocumentRead)
async def reingest_document(
    document_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    doc = await document_service.reingest_document(db, workspace_id=ctx.workspace.id, document_id=document_id)
    await enqueue_document_ingestion(doc.id)
    return DocumentRead.model_validate(doc)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    ctx: WorkspaceContext = Depends(get_workspace_ctx),
    db: AsyncSession = Depends(get_db),
):
    await document_service.delete_document(db, workspace_id=ctx.workspace.id, document_id=document_id)
