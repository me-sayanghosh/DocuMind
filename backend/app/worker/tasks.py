import asyncio
import uuid
from typing import Any, Dict

from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.db.session import async_session_factory
from app.services.document_service import document_service

background_tasks = set()


async def enqueue_document_ingestion(document_id: uuid.UUID) -> None:
    # In SQLite / lightweight mode, execute directly in background without waiting for Redis
    if settings.DATABASE_URL.startswith("sqlite"):
        task = asyncio.create_task(run_ingestion_direct(document_id))
        background_tasks.add(task)
        task.add_done_callback(background_tasks.discard)
        return

    try:
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        redis = await create_pool(redis_settings)
        # Check if an active ARQ worker is registered
        worker_keys = await redis.keys("arq:worker:*")
        if not worker_keys:
            await redis.close()
            task = asyncio.create_task(run_ingestion_direct(document_id))
            background_tasks.add(task)
            task.add_done_callback(background_tasks.discard)
            return

        await redis.enqueue_job("ingest_document", str(document_id))
        await redis.close()
    except Exception:
        # If Redis is unavailable in local dev/tests, run task in background asyncio task
        task = asyncio.create_task(run_ingestion_direct(document_id))
        background_tasks.add(task)
        task.add_done_callback(background_tasks.discard)


async def run_ingestion_direct(document_id: uuid.UUID) -> None:
    try:
        async with async_session_factory() as db:
            await document_service.process_document_ingestion(db, document_id)
    except Exception as e:
        import structlog

        logger = structlog.get_logger()
        await logger.aerror(
            "Failed direct document ingestion", document_id=str(document_id), error=str(e)
        )


async def ingest_document(ctx: Dict[str, Any], document_id_str: str) -> None:
    document_id = uuid.UUID(document_id_str)
    async with async_session_factory() as db:
        await document_service.process_document_ingestion(db, document_id)


async def run_eval_job(ctx: Dict[str, Any], run_id_str: str) -> None:
    from app.evals.runner import eval_runner

    run_id = uuid.UUID(run_id_str)
    async with async_session_factory() as db:
        await eval_runner.execute_run(db, run_id)
