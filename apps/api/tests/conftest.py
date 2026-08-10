import os

# We must set this before core.config is imported!
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["ENVIRONMENT"] = "test"

import pytest
from httpx import AsyncClient

from main import app


@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
