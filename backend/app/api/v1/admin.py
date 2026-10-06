import statistics
from typing import Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.message import Message
from app.models.trace import QueryTrace
from app.models.usage import UsageEvent
from app.models.user import User
from app.schemas.admin import LatencyPercentiles, MetricsResponse, UserUsage

router = APIRouter(prefix="/admin", tags=["admin"])


def _percentile(sorted_values: List[float], pct: float) -> float:
    """Return the `pct`-th percentile of a pre-sorted list (0–100)."""
    n = len(sorted_values)
    if n == 0:
        return 0.0
    idx = (pct / 100) * (n - 1)
    lo, hi = int(idx), min(int(idx) + 1, n - 1)
    frac = idx - lo
    return sorted_values[lo] + frac * (sorted_values[hi] - sorted_values[lo])


def get_percentiles(values: List[float]) -> LatencyPercentiles:
    if not values:
        return LatencyPercentiles()
    sv = sorted(values)
    return LatencyPercentiles(
        p50=round(_percentile(sv, 50), 1),
        p90=round(_percentile(sv, 90), 1),
        p95=round(_percentile(sv, 95), 1),
        p99=round(_percentile(sv, 99), 1),
    )


@router.get("/metrics", response_model=MetricsResponse)
async def get_system_metrics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    traces_stmt = select(QueryTrace)
    traces_res = await db.execute(traces_stmt)
    traces = traces_res.scalars().all()

    query_volume = len(traces)

    msg_count_stmt = select(func.count(Message.id)).where(Message.role == "assistant")
    error_count_stmt = select(func.count(Message.id)).where(Message.status == "error")

    total_msgs = (await db.execute(msg_count_stmt)).scalar() or 0
    error_msgs = (await db.execute(error_count_stmt)).scalar() or 0

    failure_rate = (error_msgs / total_msgs) if total_msgs > 0 else 0.0

    stages: Dict[str, LatencyPercentiles] = {
        "rewrite": get_percentiles([float(t.rewrite_ms) for t in traces if t.rewrite_ms > 0]),
        "dense": get_percentiles([float(t.dense_ms) for t in traces if t.dense_ms > 0]),
        "fts": get_percentiles([float(t.fts_ms) for t in traces if t.fts_ms > 0]),
        "fuse": get_percentiles([float(t.fuse_ms) for t in traces if t.fuse_ms > 0]),
        "rerank": get_percentiles([float(t.rerank_ms) for t in traces if t.rerank_ms > 0]),
        "first_token": get_percentiles([float(t.first_token_ms) for t in traces if t.first_token_ms > 0]),
        "total": get_percentiles([float(t.total_ms) for t in traces if t.total_ms > 0]),
    }

    return MetricsResponse(
        query_volume=query_volume,
        failure_rate=round(failure_rate, 4),
        stages=stages,
    )


@router.get("/usage", response_model=List[UserUsage])
async def get_user_usage(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(
            User.id,
            User.email,
            func.coalesce(func.count(UsageEvent.id), 0).label("query_count"),
            func.coalesce(func.sum(UsageEvent.tokens_in), 0).label("tokens_in"),
            func.coalesce(func.sum(UsageEvent.tokens_out), 0).label("tokens_out"),
        )
        .outerjoin(UsageEvent, User.id == UsageEvent.user_id)
        .group_by(User.id, User.email)
    )
    rows = await db.execute(stmt)
    return [
        UserUsage(
            user_id=r[0],
            email=r[1],
            total_queries=r[2],
            total_tokens_in=r[3],
            total_tokens_out=r[4],
        )
        for r in rows.all()
    ]
