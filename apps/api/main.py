from fastapi import FastAPI, Depends, Request
from core.config import settings

app = FastAPI(title="EMIVO API", version="1.0.0")

@app.get("/health/live")
async def health_live():
    return {"status": "ok"}

@app.get("/health/ready")
async def health_ready():
    # TODO: Add DB/Redis checks
    return {"status": "ok"}
