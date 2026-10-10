from typing import Any, Dict, Optional

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppException(Exception):
    def __init__(
        self,
        status_code: int = 500,
        title: str = "Internal Server Error",
        detail: str = "An unexpected error occurred",
        code: str = "INTERNAL_ERROR",
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(detail)
        self.status_code = status_code
        self.title = title
        self.detail = detail
        self.code = code
        self.headers = headers or {}


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(status_code=404, title="Not Found", detail=detail, code=code)


class ForbiddenException(AppException):
    def __init__(self, detail: str = "Access forbidden", code: str = "FORBIDDEN"):
        super().__init__(status_code=403, title="Forbidden", detail=detail, code=code)


class UnauthorizedException(AppException):
    def __init__(self, detail: str = "Authentication required", code: str = "UNAUTHORIZED"):
        super().__init__(
            status_code=401,
            title="Unauthorized",
            detail=detail,
            code=code,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ConflictException(AppException):
    def __init__(self, detail: str = "Resource conflict", code: str = "CONFLICT"):
        super().__init__(status_code=409, title="Conflict", detail=detail, code=code)


class ValidationException(AppException):
    def __init__(self, detail: str = "Invalid request", code: str = "VALIDATION_ERROR"):
        super().__init__(status_code=400, title="Validation Error", detail=detail, code=code)


class QuotaExceededException(AppException):
    def __init__(self, detail: str = "Daily quota exceeded", code: str = "QUOTA_EXCEEDED"):
        super().__init__(status_code=429, title="Quota Exceeded", detail=detail, code=code)


class RateLimitException(AppException):
    def __init__(
        self,
        detail: str = "Too many requests. Please try again later.",
        retry_after: int = 60,
    ):
        super().__init__(
            status_code=429,
            title="Rate Limit Exceeded",
            detail=detail,
            code="RATE_LIMIT_EXCEEDED",
            headers={"Retry-After": str(retry_after)},
        )


class PayloadTooLargeException(AppException):
    def __init__(self, detail: str = "Payload exceeds maximum allowed size"):
        super().__init__(
            status_code=413,
            title="Payload Too Large",
            detail=detail,
            code="PAYLOAD_TOO_LARGE",
        )


class UnsupportedMediaTypeException(AppException):
    def __init__(self, detail: str = "Unsupported media type. Only PDF is accepted."):
        super().__init__(
            status_code=415,
            title="Unsupported Media Type",
            detail=detail,
            code="UNSUPPORTED_MEDIA_TYPE",
        )


class IngestionException(AppException):
    def __init__(self, detail: str = "Document ingestion failed"):
        super().__init__(
            status_code=422,
            title="Ingestion Error",
            detail=detail,
            code="INGESTION_ERROR",
        )


def make_problem_response(
    status: int,
    title: str,
    detail: str,
    code: str,
    request_id: str = "",
    headers: Optional[Dict[str, str]] = None,
) -> JSONResponse:
    content: Dict[str, Any] = {
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
        "request_id": request_id,
    }
    return JSONResponse(status_code=status, content=content, headers=headers)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    return make_problem_response(
        status=exc.status_code,
        title=exc.title,
        detail=exc.detail,
        code=exc.code,
        request_id=request_id,
        headers=exc.headers,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    title_map = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        422: "Unprocessable Entity",
        500: "Internal Server Error",
    }
    return make_problem_response(
        status=exc.status_code,
        title=title_map.get(exc.status_code, "Error"),
        detail=str(exc.detail),
        code="HTTP_ERROR",
        request_id=request_id,
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    errors = exc.errors()
    first_error = errors[0]["msg"] if errors else "Validation failed"
    return make_problem_response(
        status=422,
        title="Unprocessable Entity",
        detail=first_error,
        code="VALIDATION_ERROR",
        request_id=request_id,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    err_str = str(exc)
    if "Connection refused" in err_str or isinstance(exc, (ConnectionRefusedError, OSError)):
        return make_problem_response(
            status=503,
            title="Database Unavailable",
            detail="Database connection failed. If running locally without PostgreSQL or Docker, set DATABASE_URL=sqlite+aiosqlite:///./docchat.db in .env.",
            code="DATABASE_UNAVAILABLE",
            request_id=request_id,
        )
    return make_problem_response(
        status=500,
        title="Internal Server Error",
        detail="An unexpected internal server error occurred",
        code="INTERNAL_ERROR",
        request_id=request_id,
    )
