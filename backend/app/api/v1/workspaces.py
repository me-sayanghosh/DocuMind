from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import WorkspaceContext, get_current_user, require_workspace_owner
from app.db.session import get_db
from app.models.user import User
from app.schemas.workspace import WorkspaceCreate, WorkspaceInvite, WorkspaceRead, WorkspaceUpdate
from app.services.email_service import email_service
from app.services.workspace_service import workspace_service

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=List[WorkspaceRead])
async def list_workspaces(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pairs = await workspace_service.list_user_workspaces(db, user_id=user.id)
    return [
        WorkspaceRead(
            id=ws.id,
            name=ws.name,
            owner_id=ws.owner_id,
            role=role,
            created_at=ws.created_at,
        )
        for ws, role in pairs
    ]


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await workspace_service.create_workspace(db, user_id=user.id, name=data.name)
    return WorkspaceRead(
        id=ws.id,
        name=ws.name,
        owner_id=ws.owner_id,
        role="owner",
        created_at=ws.created_at,
    )


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
async def rename_workspace(
    data: WorkspaceUpdate,
    ctx: WorkspaceContext = Depends(require_workspace_owner),
    db: AsyncSession = Depends(get_db),
):
    ws = await workspace_service.rename_workspace(db, workspace_id=ctx.workspace.id, new_name=data.name)
    return WorkspaceRead(
        id=ws.id,
        name=ws.name,
        owner_id=ws.owner_id,
        role="owner",
        created_at=ws.created_at,
    )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    ctx: WorkspaceContext = Depends(require_workspace_owner),
    db: AsyncSession = Depends(get_db),
):
    await workspace_service.delete_workspace(db, workspace_id=ctx.workspace.id)


@router.post("/{workspace_id}/invites", status_code=status.HTTP_200_OK)
async def invite_member(
    data: WorkspaceInvite,
    background_tasks: BackgroundTasks,
    ctx: WorkspaceContext = Depends(require_workspace_owner),
    db: AsyncSession = Depends(get_db),
):
    member, invitation, is_registered = await workspace_service.invite_member(
        db, workspace_id=ctx.workspace.id, email=data.email, role=data.role
    )

    # Dispatch email notification in background
    background_tasks.add_task(
        email_service.send_workspace_invitation,
        to_email=data.email.strip().lower(),
        workspace_name=ctx.workspace.name,
        inviter_email=ctx.user.email,
        role=data.role,
        is_registered=is_registered,
    )

    return {
        "status": "success",
        "user_id": str(member.user_id) if member else None,
        "role": data.role,
        "is_registered": is_registered,
        "email_sent": True,
        "message": f"Successfully invited {data.email}. An invitation email has been sent.",
    }
