from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from core.middleware import request_id_middleware
from modules.ai_gateway.router import router as ai_gateway_router
from modules.auth.router import router as auth_router
from modules.businesses.router import router as businesses_router
from modules.carts.router import router as carts_router
from modules.coupons.router import router as coupons_router
from modules.payments.router import router as payments_router
from modules.products.router import router as products_router
from modules.recommendations.router import router as recommendations_router
from modules.search.router import router as search_router
from modules.users.router import router as users_router
from modules.entitlements.router import router as entitlements_router
from modules.voice.routers.voice_router import router as voice_router
from modules.media.router import router as media_router

app = FastAPI(title="EMIVO API")

app.add_middleware(BaseHTTPMiddleware, dispatch=request_id_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(businesses_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(carts_router, prefix="/api/v1")
app.include_router(coupons_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(ai_gateway_router, prefix="/api/v1")
app.include_router(voice_router, prefix="/api/v1")
app.include_router(media_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api/v1")

app.include_router(entitlements_router, prefix="/api/v1")


@app.get("/health/live")
async def liveness():
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness():
    return {"status": "ready"}
