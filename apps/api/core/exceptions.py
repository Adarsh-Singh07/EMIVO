from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    code: str
    request_id: str | None = None


class DomainException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "BAD_REQUEST",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code


def _get_cors_headers(request: Request) -> dict[str, str]:
    from core.config import settings

    origin = request.headers.get("origin")
    headers: dict[str, str] = {}
    if origin and (
        origin in settings.cors_origins_list
        or origin.endswith(".elektrix.in")
        or origin.startswith("http://localhost")
        or origin.startswith("http://127.0.0.1")
    ):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Headers"] = "*"
        headers["Access-Control-Allow-Methods"] = "*"
    return headers


async def domain_exception_handler(request: Request, exc: DomainException):
    request_id = (
        request.state.request_id if hasattr(request.state, "request_id") else None
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "code": exc.code, "request_id": request_id},
        headers=_get_cors_headers(request),
    )


async def unhandled_exception_handler(request: Request, exc: Exception):
    import structlog

    logger = structlog.get_logger()
    logger.exception("Unhandled exception", exc=exc)

    request_id = (
        request.state.request_id if hasattr(request.state, "request_id") else None
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "We couldn't complete that request. Please try again.",
            "code": "INTERNAL_ERROR",
            "request_id": request_id,
        },
        headers=_get_cors_headers(request),
    )
