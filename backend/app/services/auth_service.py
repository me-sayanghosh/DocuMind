from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    get_password_hash,
    hash_refresh_token,
    verify_password,
)
from app.models.user import RefreshToken, User
from app.models.workspace import Workspace, WorkspaceMember


class AuthService:
    async def register(self, db: AsyncSession, email: str, password: str) -> User:
        clean_email = email.strip().lower()

        # Check existing user
        existing = await db.execute(select(User).where(User.email == clean_email))
        if existing.scalar_one_or_none():
            raise ConflictException("An account with this email address already exists")

        # Create user
        user = User(
            email=clean_email,
            password_hash=get_password_hash(password),
            is_active=True,
            is_admin=False,
        )
        db.add(user)
        await db.flush()

        # Automatically create default workspace
        workspace = Workspace(
            name="Personal Workspace",
            owner_id=user.id,
        )
        db.add(workspace)
        await db.flush()

        # Add ownership membership
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role="owner",
        )
        db.add(member)
        await db.commit()
        await db.refresh(user)

        return user

    async def login(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str, User]:
        clean_email = email.strip().lower()

        stmt = select(User).where(User.email == clean_email, User.is_active == True)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        # Create access token
        access_token = create_access_token(subject=str(user.id))

        # Create opaque refresh token
        raw_refresh = generate_refresh_token()
        token_hash = hash_refresh_token(raw_refresh)

        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        refresh_entry = RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent[:500] if user_agent else None,
        )
        db.add(refresh_entry)
        await db.commit()

        return access_token, raw_refresh, user

    async def refresh_tokens(
        self,
        db: AsyncSession,
        raw_refresh_token: str,
        user_agent: Optional[str] = None,
    ) -> Tuple[str, str]:
        token_hash = hash_refresh_token(raw_refresh_token)

        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await db.execute(stmt)
        token_record = result.scalar_one_or_none()

        if not token_record:
            raise UnauthorizedException("Invalid refresh token")

        now = datetime.now(timezone.utc)

        # REUSE DETECTION WITH GRACE PERIOD (RFC 6819 Section 5.2.2.3)
        # If token was already revoked, check if it was revoked within a grace period (30s)
        # to tolerate concurrent requests (React StrictMode double-mount, multi-tab, network retry)
        if token_record.revoked_at is not None:
            grace_seconds = 30
            revoked_time = token_record.revoked_at
            if revoked_time.tzinfo is None:
                revoked_time = revoked_time.replace(tzinfo=timezone.utc)
            if (now - revoked_time).total_seconds() > grace_seconds:
                # Outside grace period: real reuse attack!
                await db.execute(
                    update(RefreshToken)
                    .where(RefreshToken.user_id == token_record.user_id)
                    .values(revoked_at=now)
                )
                await db.commit()
                raise UnauthorizedException("Compromised session detected. All sessions revoked. Please log in again.")
            else:
                # Inside grace period: issue a new valid pair
                new_access_token = create_access_token(subject=str(token_record.user_id))
                new_raw_refresh = generate_refresh_token()
                new_token_hash = hash_refresh_token(new_raw_refresh)
                new_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

                new_record = RefreshToken(
                    user_id=token_record.user_id,
                    token_hash=new_token_hash,
                    expires_at=new_expires_at,
                    user_agent=user_agent[:500] if user_agent else None,
                )
                db.add(new_record)
                await db.commit()
                return new_access_token, new_raw_refresh

        if token_record.expires_at < now:
            raise UnauthorizedException("Refresh token has expired")

        # Rotate refresh token: revoke current
        token_record.revoked_at = now

        # Issue new pair
        new_access_token = create_access_token(subject=str(token_record.user_id))
        new_raw_refresh = generate_refresh_token()
        new_token_hash = hash_refresh_token(new_raw_refresh)
        new_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_record = RefreshToken(
            user_id=token_record.user_id,
            token_hash=new_token_hash,
            expires_at=new_expires_at,
            user_agent=user_agent[:500] if user_agent else None,
        )
        db.add(new_record)
        await db.commit()

        return new_access_token, new_raw_refresh

    async def logout(self, db: AsyncSession, raw_refresh_token: str) -> None:
        token_hash = hash_refresh_token(raw_refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        result = await db.execute(stmt)
        token_record = result.scalar_one_or_none()
        if token_record and token_record.revoked_at is None:
            token_record.revoked_at = datetime.now(timezone.utc)
            await db.commit()


auth_service = AuthService()
