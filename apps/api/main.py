from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.dependencies import require_staff
from core.middleware import RequestIdMiddleware
from core.ratelimit import RateLimitMiddleware
from routers import businesses, settings as routers_settings
from modules.auth.router import router as auth_router
from modules.users.router import router as users_router
from modules.customers.router import router as customers_router
from modules.products.router import router as products_router
from modules.storefront.router import router as storefront_router
from modules.orders.router import router as orders_router
from modules.carts.router import router as carts_router
from modules.payments.router import router as payments_router
from modules.coupons.router import router as coupons_router
from modules.addresses.router import router as addresses_router
from modules.wishlist.router import router as wishlist_router
from modules.notifications.router import router as notifications_router
from modules.inventory.router import router as inventory_router
from modules.admin.router import router as admin_router
from modules.media.router import router as media_router
from modules.marketing.router import router as newsletter_router
from contextlib import asynccontextmanager
from core.redis import lifespan_redis
from core.exceptions import DomainException, domain_exception_handler, unhandled_exception_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with lifespan_redis():
        yield


app = FastAPI(
    title="ELEKTRIX API",
    description="ELEKTRIX e-commerce platform API",
    version="2.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestIdMiddleware)

app.add_exception_handler(DomainException, domain_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.get("/health/live")
async def health_live():
    return {"status": "ok"}


@app.get("/health/ready")
async def health_ready():
    return {"status": "ready"}


@app.get("/health/diagnostics")
@app.get("/api/v1/system/status")
async def health_diagnostics(
    _staff=Depends(require_staff),
):
    import time
    import os
    import sys
    import shutil
    import subprocess
    from sqlalchemy import text
    from core.database import async_session_maker
    from core.redis import get_redis_client

    db_status = "unhealthy"
    db_latency_ms = None
    migration_version = None
    try:
        start_time = time.time()
        async with async_session_maker() as session:
            res = await session.execute(text("SELECT version_num FROM alembic_version"))
            migration_version = res.scalar()
            await session.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - start_time) * 1000, 2)
        db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)[:200]}"

    redis_status = "unhealthy"
    redis_latency_ms = None
    arq_workers = 0
    try:
        start_time = time.time()
        redis = get_redis_client()
        await redis.ping()
        redis_latency_ms = round((time.time() - start_time) * 1000, 2)
        redis_status = "healthy"
        try:
            arq_workers = len(await redis.keys("arq:*:queue")) or 0
        except Exception:
            pass
    except Exception as e:
        redis_status = f"error: {str(e)[:200]}"

    git_commit = os.getenv("GIT_COMMIT")
    if not git_commit:
        try:
            git_commit = subprocess.check_output(
                ["git", "rev-parse", "--short", "HEAD"], text=True
            ).strip()
        except Exception:
            git_commit = "unknown"

    disk = shutil.disk_usage(".")
    disk_free_gb = round(disk.free / (1024 ** 3), 2)
    disk_total_gb = round(disk.total / (1024 ** 3), 2)

    provider = settings.payment_provider
    return {
        "status": "healthy" if (db_status == "healthy" and redis_status == "healthy") else "degraded",
        "environment": settings.env_name,
        "version": "2.0.0",
        "git_commit": git_commit,
        "migration_version": migration_version,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "python_version": sys.version.split()[0],
        "pid": os.getpid(),
        "system": {
            "cpus": os.cpu_count(),
            "disk_free_gb": disk_free_gb,
            "disk_total_gb": disk_total_gb,
        },
        "services": {
            "database": {
                "status": db_status,
                "latency_ms": db_latency_ms,
                "migration_version": migration_version,
                "provider": "Supabase PostgreSQL (RLS enforced)",
            },
            "redis": {
                "status": redis_status,
                "latency_ms": redis_latency_ms,
                "provider": "Redis 7+",
            },
            "payments": {
                "provider": provider,
                "status": "configured" if provider == "razorpay" else "mock-only (non-prod)",
            },
            "email": {
                "provider": "resend" if settings.resend_api_key.get_secret_value() else "mock-logger",
            },
            "media": {
                "provider": "cloudflare-r2" if settings.r2_public_url else "unconfigured",
            },
            "workers": {
                "status": "healthy" if redis_status == "healthy" else "unknown",
                "detected_queues": arq_workers,
            },
        },
    }


app.include_router(businesses.router, prefix="/api/v1")
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(products_router)
app.include_router(storefront_router)
app.include_router(orders_router)
app.include_router(customers_router)
app.include_router(carts_router)
app.include_router(payments_router, prefix="/api/v1")
app.include_router(coupons_router, prefix="/api/v1")
app.include_router(addresses_router)
app.include_router(wishlist_router)
app.include_router(notifications_router)
app.include_router(inventory_router)
app.include_router(admin_router)
app.include_router(media_router)
app.include_router(newsletter_router)
app.include_router(routers_settings.router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
