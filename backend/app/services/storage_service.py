import asyncio
import contextlib
import os
import uuid
from typing import Optional, cast

import aiofiles  # type: ignore[import-untyped]

from app.core.config import settings


class StorageService:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or settings.UPLOAD_DIR
        self.backend = settings.STORAGE_BACKEND.lower()
        if self.backend == "local":
            os.makedirs(self.base_dir, exist_ok=True)
        elif self.backend == "s3":
            import boto3

            self.client = boto3.client(
                "s3",
                endpoint_url=settings.S3_ENDPOINT_URL or None,
                aws_access_key_id=settings.S3_ACCESS_KEY_ID,
                aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
                region_name=settings.S3_REGION,
            )
        else:
            raise ValueError(f"Unsupported storage backend: {settings.STORAGE_BACKEND}")

    def _get_path(self, storage_key: str) -> str:
        # Sanitize path to prevent directory traversal
        sanitized_key = os.path.normpath(storage_key).lstrip("/")
        return os.path.join(self.base_dir, sanitized_key)

    async def save_file(self, workspace_id: uuid.UUID, filename: str, content: bytes) -> str:
        # Secure storage key: {workspace_id}/{uuid}.pdf
        ext = os.path.splitext(filename)[1].lower() or ".pdf"
        storage_key = f"{workspace_id}/{uuid.uuid4()}{ext}"
        if self.backend == "s3":
            await asyncio.to_thread(
                self.client.put_object,
                Bucket=settings.S3_BUCKET,
                Key=storage_key,
                Body=content,
                ContentType="application/pdf",
            )
        else:
            full_path = self._get_path(storage_key)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            async with aiofiles.open(full_path, "wb") as f:
                await f.write(content)

        return storage_key

    async def read_file(self, storage_key: str) -> bytes:
        if self.backend == "s3":
            response = await asyncio.to_thread(
                self.client.get_object,
                Bucket=settings.S3_BUCKET,
                Key=storage_key,
            )
            return cast(bytes, await asyncio.to_thread(response["Body"].read))

        full_path = self._get_path(storage_key)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Stored file not found: {storage_key}")
        async with aiofiles.open(full_path, "rb") as f:
            return cast(bytes, await f.read())

    async def delete_file(self, storage_key: str) -> None:
        if self.backend == "s3":
            await asyncio.to_thread(
                self.client.delete_object,
                Bucket=settings.S3_BUCKET,
                Key=storage_key,
            )
            return

        full_path = self._get_path(storage_key)
        if os.path.exists(full_path):
            with contextlib.suppress(OSError):
                os.remove(full_path)


storage_service = StorageService()
