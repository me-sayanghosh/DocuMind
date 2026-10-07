from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Header, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.errors import UnauthorizedException
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    MeResponse,
    TokenRefreshResponse,
    TokenResponse,
    UserLogin,
    UserRead,
    UserRegister,
    WorkspaceSummary,
)
from app.services.auth_service import auth_service
from app.services.workspace_service import workspace_service

router = APIRouter(prefix="/auth", tags=["auth"])


def set_refresh_cookie(response: Response, raw_token: str) -> None:
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        max_age=max_age,
        expires=max_age,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        path="/api/v1/auth",
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    user = await auth_service.register(db, email=data.email, password=data.password)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    user_agent = request.headers.get("user-agent")
    access_token, raw_refresh, user = await auth_service.login(
        db, email=data.email, password=data.password, user_agent=user_agent
    )
    set_refresh_cookie(response, raw_refresh)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserRead.model_validate(user),
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    x_requested_with: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise UnauthorizedException("Refresh token cookie missing")

    user_agent = request.headers.get("user-agent")
    new_access_token, new_raw_refresh = await auth_service.refresh_tokens(
        db, raw_refresh_token=refresh_token, user_agent=user_agent
    )
    set_refresh_cookie(response, new_raw_refresh)
    return TokenRefreshResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        await auth_service.logout(db, raw_refresh_token=refresh_token)
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")


@router.get("/me", response_model=MeResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspaces = await workspace_service.list_user_workspaces(db, user_id=user.id)
    ws_summaries = [
        WorkspaceSummary(
            id=ws.id,
            name=ws.name,
            role=role,
            created_at=ws.created_at,
        )
        for ws, role in workspaces
    ]
    return MeResponse(
        user=UserRead.model_validate(user),
        workspaces=ws_summaries,
    )
