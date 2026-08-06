import uuid
from typing import Callable
from fastapi import Request, Response
import structlog

logger = structlog.get_logger()

async def request_id_middleware(request: Request, call_next: Callable) -> Response:
    # Use existing trace ID from edge/CDN if available, else generate
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = req_id
    
    # Optional: bind to structlog context
    structlog.contextvars.bind_contextvars(request_id=req_id)
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    
    structlog.contextvars.clear_contextvars()
    return response
