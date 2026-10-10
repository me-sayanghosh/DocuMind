from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.documents import router as documents_router
from app.api.v1.evals import router as evals_router
from app.api.v1.search import router as search_router
from app.api.v1.system import router as system_router
from app.api.v1.workspaces import router as workspaces_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(system_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(workspaces_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(conversations_router)
api_v1_router.include_router(search_router)
api_v1_router.include_router(evals_router)
api_v1_router.include_router(admin_router)
