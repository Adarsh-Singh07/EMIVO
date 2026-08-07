import logging
import time
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class DomainException(Exception):
    def __init__(self, message: str, status_code: int = 400, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.time()

        response = await call_next(request)

        process_time = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(process_time)
        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except DomainException as e:
            logger.warning(
                f"Domain error: {e.message}",
                extra={"request_id": getattr(request.state, "request_id", None)},
            )
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error": {
                        "code": e.__class__.__name__,
                        "message": e.message,
                        "details": e.details,
                    }
                },
            )
        except Exception as e:
            request_id = getattr(request.state, "request_id", None)
            logger.exception(
                f"Unhandled server error: {e!s}", extra={"request_id": request_id}
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "InternalServerError",
                        "message": "An unexpected error occurred.",
                    }
                },
            )
