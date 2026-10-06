import asyncio
import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set testing environment variables before importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_docchat.db"
os.environ["JWT_SECRET"] = "test-secret-key-32-bytes-long-for-testing!!"
os.environ["LLM_PROVIDER"] = "fake"
os.environ["EMBED_PROVIDER"] = "hash"
os.environ["STORAGE_BACKEND"] = "local"
os.environ["UPLOAD_DIR"] = "/tmp/docchat_test/uploads"

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app

test_engine = create_async_engine("sqlite+aiosqlite:///./test_docchat.db", echo=False)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def prepare_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    try:
        if os.path.exists("./test_docchat.db"):
            os.remove("./test_docchat.db")
    except OSError:
        pass


@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    app = create_app()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
