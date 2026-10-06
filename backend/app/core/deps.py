import uuid
from dataclasses import dataclass
from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ForbiddenException, NotFoundException, UnauthorizedException
from app.core.security import decode_access_token
from app.db.session import get_db, set_db_user_context
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class WorkspaceContext:
    user: User
    workspace: Workspace
    role: str  # 'owner' or 'member'


async def get_current_user(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not auth or not auth.credentials:
        raise UnauthorizedException("Missing authentication token")

    try:
        payload = decode_access_token(auth.credentials)
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException("Invalid token payload")
        user_id = uuid.UUID(user_id_str)
    except Exception:
        raise UnauthorizedException("Invalid or expired authentication token")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedException("User not found or inactive")

    # Set Postgres RLS user context
    await set_db_user_context(db, str(user.id))
    request.state.user = user

    return user


async def get_workspace_ctx(
    workspace_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    # Query membership explicitly
    query = (
        select(Workspace, WorkspaceMember.role)
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)
        .where(
            Workspace.id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    result = await db.execute(query)
    row = result.first()

    # Per AUTH.md §4: cross-tenant access returns 404 to avoid leaking existence
    if not row:
        raise NotFoundException("Workspace not found")

    workspace, role = row
    return WorkspaceContext(user=user, workspace=workspace, role=role)


def require_workspace_owner(ctx: WorkspaceContext = Depends(get_workspace_ctx)) -> WorkspaceContext:
    if ctx.role != "owner":
        raise ForbiddenException("Only the workspace owner can perform this operation")
    return ctx


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise ForbiddenException("Administrator privileges required")
    return user
