import uuid
from typing import Dict
from pydantic import BaseModel


class LatencyPercentiles(BaseModel):
    p50: float = 0.0
    p90: float = 0.0
    p95: float = 0.0
    p99: float = 0.0


class MetricsResponse(BaseModel):
    query_volume: int
    failure_rate: float
    stages: Dict[str, LatencyPercentiles]


class UserUsage(BaseModel):
    user_id: uuid.UUID
    email: str
    total_queries: int
    total_tokens_in: int
    total_tokens_out: int
