import os
import uuid
import aiofiles
from typing import Optional
from app.core.config import settings


class StorageService:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or settings.UPLOAD_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_path(self, storage_key: str) -> str:
        # Sanitize path to prevent directory traversal
        sanitized_key = os.path.normpath(storage_key).lstrip("/")
        return os.path.join(self.base_dir, sanitized_key)

    async def save_file(self, workspace_id: uuid.UUID, filename: str, content: bytes) -> str:
        # Secure storage key: {workspace_id}/{uuid}.pdf
        ext = os.path.splitext(filename)[1].lower() or ".pdf"
        storage_key = f"{workspace_id}/{uuid.uuid4()}{ext}"
        full_path = self._get_path(storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        async with aiofiles.open(full_path, "wb") as f:
            await f.write(content)

        return storage_key

    async def read_file(self, storage_key: str) -> bytes:
        full_path = self._get_path(storage_key)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Stored file not found: {storage_key}")
        async with aiofiles.open(full_path, "rb") as f:
            return await f.read()

    async def delete_file(self, storage_key: str) -> None:
        full_path = self._get_path(storage_key)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except OSError:
                pass


storage_service = StorageService()
