import uuid
from typing import Any, Dict
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.db.session import async_session_factory
from app.services.document_service import document_service


async def enqueue_document_ingestion(document_id: uuid.UUID) -> None:
    try:
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        redis = await create_pool(redis_settings)
        await redis.enqueue_job("ingest_document", str(document_id))
        await redis.close()
    except Exception:
        # If Redis is unavailable in local dev/tests, run task in background asyncio task
        import asyncio
        asyncio.create_task(run_ingestion_direct(document_id))


async def run_ingestion_direct(document_id: uuid.UUID) -> None:
    async with async_session_factory() as db:
        await document_service.process_document_ingestion(db, document_id)


async def ingest_document(ctx: Dict[str, Any], document_id_str: str) -> None:
    document_id = uuid.UUID(document_id_str)
    async with async_session_factory() as db:
        await document_service.process_document_ingestion(db, document_id)


async def run_eval_job(ctx: Dict[str, Any], run_id_str: str) -> None:
    from app.evals.runner import eval_runner
    run_id = uuid.UUID(run_id_str)
    async with async_session_factory() as db:
        await eval_runner.execute_run(db, run_id)
