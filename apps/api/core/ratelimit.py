"""Redis fixed-window rate limiting for sensitive endpoints.

Applied as an ASGI middleware over path-prefix rules. Keyed by client IP
(for anonymous endpoints) and user id when a Bearer token is present.
Designed to stop brute force and coupon/checkout abuse without making
normal shopping frustrating.
"""
import logging
import time
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from core.config import settings
from core.redis import redis_manager

logger = logging.getLogger(__name__)

# path prefix -> (limit, window_seconds)
RATE_RULES: list[tuple[str, int, int]] = [
    ("/api/v1/auth/login", 10, 60),
    ("/api/v1/auth/register", 5, 300),
    ("/api/v1/auth/forgot-password", 5, 300),
    ("/api/v1/auth/reset-password", 10, 300),
    ("/api/v1/coupons/validate", 20, 60),
    ("/api/v1/orders/checkout", 10, 60),
    ("/api/v1/newsletter/subscribe", 5, 300),
    ("/api/v1/store/products/search", 60, 60),
    ("/api/v1/payments/webhook", 120, 60),
]

RETRY_AFTER_HEADER = "Retry-After"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if settings.is_test:
            return await call_next(request)
        path = request.url.path
        rule = next((r for r in RATE_RULES if path.startswith(r[0])), None)
        if rule is None:
            return await call_next(request)

        _, limit, window = rule
        identity = self._identity(request)
        bucket_key = f"rl:{path}:{identity}:{int(time.time() // window)}"

        try:
            count = await redis_manager.client.incr(bucket_key)
            if count == 1:
                await redis_manager.client.expire(bucket_key, window + 1)
        except Exception:
            # Redis unavailable: fail open (availability over strictness)
            logger.warning("rate limiter redis unavailable — failing open")
            return await call_next(request)

        if count > limit:
            retry = window - int(time.time() % window)
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please slow down and try again shortly.",
                    }
                },
                headers={RETRY_AFTER_HEADER: str(max(retry, 1))},
            )
        return await call_next(request)

    @staticmethod
    def _identity(request: Request) -> str:
        # Prefer authenticated user id; fall back to client IP
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            # Hash the token so raw tokens never land in Redis keys/logs
            import hashlib

            return "u:" + hashlib.sha256(auth[7:].encode()).hexdigest()[:24]
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
        return "ip:" + ip
