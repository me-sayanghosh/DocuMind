from fastapi import APIRouter
from sqlalchemy import text
from app.db.session import engine

router = APIRouter(tags=["system"])


@router.get("/healthz")
async def healthz():
    """Liveness probe."""
    return {"status": "ok"}


@router.get("/readyz")
async def readyz():
    """Readiness probe checking DB connection."""
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ready" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
    }


@router.get("/version")
async def version():
    return {
        "version": "0.1.0",
        "app": "DocChat RAG",
        "description": "Multi-tenant PDF RAG with verifiable citations and eval harness",
    }
