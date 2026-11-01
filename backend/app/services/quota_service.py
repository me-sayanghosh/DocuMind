import time
import uuid
from typing import Dict, List, Optional

from redis.asyncio import Redis

from app.core.config import settings
from app.core.errors import QuotaExceededException, RateLimitException

# In-memory sliding window fallback
_rate_limits: Dict[str, List[float]] = {}
_daily_quotas: Dict[str, Dict[str, int]] = {}  # {user_id: {date_str: count}}


class QuotaService:
    def __init__(self) -> None:
        self._redis: Optional[Redis] = None
        self._redis_unavailable = False

    async def _check_rate_limit_redis(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> Optional[int]:
        if settings.DATABASE_URL.startswith("sqlite") or self._redis_unavailable:
            return None

        try:
            if self._redis is None:
                self._redis = Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=0.2,
                    socket_timeout=0.2,
                )

            now = time.time()
            redis_key = f"docchat:rate:{key}"
            member = f"{now}:{uuid.uuid4()}"
            async with self._redis.pipeline(transaction=True) as pipe:
                await pipe.zremrangebyscore(redis_key, 0, now - window_seconds)
                await pipe.zcard(redis_key)
                await pipe.zrange(redis_key, 0, 0, withscores=True)
                count, oldest = (await pipe.execute())[1:]

                if count >= max_requests:
                    oldest_score = oldest[0][1] if oldest else now
                    return max(1, int(window_seconds - (now - oldest_score)) + 1)

                await self._redis.zadd(redis_key, {member: now})
                await self._redis.expire(redis_key, window_seconds)
                return 0
        except Exception:
            self._redis_unavailable = True
            if self._redis is not None:
                await self._redis.close()
                self._redis = None
            return None

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int = 30,
        window_seconds: int = 60,
    ) -> None:
        retry_after = await self._check_rate_limit_redis(key, max_requests, window_seconds)
        if retry_after:
            raise RateLimitException(
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                retry_after=retry_after,
            )
        if not settings.DATABASE_URL.startswith("sqlite") and not self._redis_unavailable:
            return

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

    async def check_auth_rate_limit(self, key: str, action: str) -> None:
        await self.check_rate_limit(
            key=f"auth:{action}:{key}",
            max_requests=5 if action == "login" else 20,
            window_seconds=15 * 60,
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
