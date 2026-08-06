from fastapi import FastAPI, Depends, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.database import db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    yield
    # Shutdown
    await db.disconnect()

app = FastAPI(title="EMIVO API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health/live")
async def health_live():
    return {"status": "ok"}

@app.get("/health/ready")
async def health_ready():
    # Attempt a trivial DB query to verify readiness
    try:
        async with db.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
        
    return {"status": "ok", "database": "connected"}
