import time
import uuid
from typing import Dict, List

from app.core.config import settings
from app.core.errors import QuotaExceededException, RateLimitException

# In-memory sliding window fallback
_rate_limits: Dict[str, List[float]] = {}
_daily_quotas: Dict[str, Dict[str, int]] = {}  # {user_id: {date_str: count}}


class QuotaService:
    async def check_rate_limit(
        self,
        key: str,
        max_requests: int = 30,
        window_seconds: int = 60,
    ) -> None:
        now = time.time()
        timestamps = _rate_limits.setdefault(key, [])
        # Prune expired
        timestamps[:] = [t for t in timestamps if now - t < window_seconds]

        if len(timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - timestamps[0])) + 1
            raise RateLimitException(
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                retry_after=max(1, retry_after),
            )

        timestamps.append(now)

    async def check_chat_rate_limit(self, user_id: uuid.UUID) -> None:
        await self.check_rate_limit(
            key=f"chat:{user_id}",
            max_requests=settings.CHAT_RATE_LIMIT_PER_MINUTE,
            window_seconds=60,
        )

    async def check_daily_quota(self, user_id: uuid.UUID) -> None:
        today = time.strftime("%Y-%m-%d")
        user_counts = _daily_quotas.setdefault(str(user_id), {})
        current = user_counts.get(today, 0)

        if current >= settings.DAILY_QUESTION_QUOTA:
            raise QuotaExceededException(
                detail=f"Daily question quota ({settings.DAILY_QUESTION_QUOTA}) reached. Please try again tomorrow."
            )

        user_counts[today] = current + 1


quota_service = QuotaService()
