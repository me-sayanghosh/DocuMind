from arq.connections import RedisSettings

from app.core.config import settings
from app.worker.tasks import ingest_document, run_eval_job


class WorkerSettings:
    functions = [ingest_document, run_eval_job]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_tries = 3
    job_timeout = 300
