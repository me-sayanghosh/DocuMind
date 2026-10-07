import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictException, NotFoundException
from app.models.document import Document
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceInvitation, WorkspaceMember
from app.services.storage_service import storage_service


class WorkspaceService:
    async def list_user_workspaces(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> List[Tuple[Workspace, str]]:
        stmt = (
            select(Workspace, WorkspaceMember.role)
            .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == user_id)
            .order_by(Workspace.created_at.asc())
        )
        res = await db.execute(stmt)
        return [(ws, role) for ws, role in res.all()]

    async def create_workspace(
        self, db: AsyncSession, user_id: uuid.UUID, name: str
    ) -> Workspace:
        ws = Workspace(
            name=name.strip(),
            owner_id=user_id,
        )
        db.add(ws)
        await db.flush()

        member = WorkspaceMember(
            workspace_id=ws.id,
            user_id=user_id,
            role="owner",
        )
        db.add(member)
        await db.commit()
        await db.refresh(ws)
        return ws

    async def rename_workspace(
        self, db: AsyncSession, workspace_id: uuid.UUID, new_name: str
    ) -> Workspace:
        ws = await db.get(Workspace, workspace_id)
        if not ws:
            raise NotFoundException("Workspace not found")
        ws.name = new_name.strip()
        await db.commit()
        await db.refresh(ws)
        return ws

    async def delete_workspace(self, db: AsyncSession, workspace_id: uuid.UUID) -> None:
        ws = await db.get(Workspace, workspace_id)
        if not ws:
            raise NotFoundException("Workspace not found")

        # Fetch all document storage keys in workspace to remove from filesystem
        doc_stmt = select(Document.storage_key).where(Document.workspace_id == workspace_id)
        keys_res = await db.execute(doc_stmt)
        storage_keys = keys_res.scalars().all()

        for key in storage_keys:
            await storage_service.delete_file(key)

        await db.delete(ws)
        await db.commit()

    async def invite_member(
        self, db: AsyncSession, workspace_id: uuid.UUID, email: str, role: str
    ) -> Tuple[Optional[WorkspaceMember], Optional[WorkspaceInvitation], bool]:
        clean_email = email.strip().lower()
        user_stmt = select(User).where(User.email == clean_email)
        user_res = await db.execute(user_stmt)
        target_user = user_res.scalar_one_or_none()

        if target_user:
            existing = await db.get(WorkspaceMember, (workspace_id, target_user.id))
            if existing:
                raise ConflictException("User is already a member of this workspace")

            member = WorkspaceMember(
                workspace_id=workspace_id,
                user_id=target_user.id,
                role=role,
            )
            db.add(member)
            await db.commit()
            await db.refresh(member)
            return member, None, True
        else:
            # User is not registered yet: create or update a pending workspace invitation
            inv_stmt = select(WorkspaceInvitation).where(
                WorkspaceInvitation.workspace_id == workspace_id,
                WorkspaceInvitation.email == clean_email,
            )
            inv_res = await db.execute(inv_stmt)
            invitation = inv_res.scalar_one_or_none()
            if not invitation:
                invitation = WorkspaceInvitation(
                    workspace_id=workspace_id,
                    email=clean_email,
                    role=role,
                )
                db.add(invitation)
            else:
                invitation.role = role

            await db.commit()
            await db.refresh(invitation)
            return None, invitation, False


workspace_service = WorkspaceService()
