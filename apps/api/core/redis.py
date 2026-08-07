from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from redis.asyncio import ConnectionPool, Redis

from .config import settings


class RedisManager:
    def __init__(self, url: str):
        self.url = url
        self.pool: ConnectionPool | None = None
        self._redis: Redis | None = None

    async def connect(self) -> None:
        if not self.pool:
            self.pool = ConnectionPool.from_url(
                self.url, decode_responses=True, max_connections=10
            )
            self._redis = Redis(connection_pool=self.pool)

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.aclose()
        if self.pool:
            await self.pool.disconnect()

    @property
    def client(self) -> Redis:
        if not self._redis:
            raise RuntimeError("Redis is not connected")
        return self._redis


# Singleton instance
redis_manager = RedisManager(settings.redis_url)


async def get_redis() -> AsyncGenerator[Redis, None]:
    """Dependency that yields the redis client."""
    if not redis_manager._redis:
        await redis_manager.connect()
    yield redis_manager.client


@asynccontextmanager
async def lifespan_redis() -> AsyncGenerator[None, None]:
    """Lifespan context manager to handle redis connections."""
    await redis_manager.connect()
    try:
        yield
    finally:
        await redis_manager.disconnect()


class TenantRedis:
    """
    Wrapper for Redis that enforces tenant isolation.
    Ensures all keys are explicitly prefixed with 'tenant:{business_id}:*'
    per invariant 3.3.
    """

    def __init__(self, client: Redis, business_id: str):
        self._client = client
        self.business_id = str(business_id)
        self.prefix = f"tenant:{self.business_id}:"

    def _key(self, key: str) -> str:
        return f"{self.prefix}{key}"

    async def get(self, key: str) -> Any:
        return await self._client.get(self._key(key))

    async def set(
        self,
        key: str,
        value: Any,
        ex: int | None = None,
        px: int | None = None,
        nx: bool = False,
        xx: bool = False,
    ) -> Any:
        return await self._client.set(self._key(key), value, ex=ex, px=px, nx=nx, xx=xx)

    async def delete(self, *keys: str) -> int:
        if not keys:
            return 0
        prefixed_keys = [self._key(k) for k in keys]
        return await self._client.delete(*prefixed_keys)

    async def exists(self, *keys: str) -> int:
        if not keys:
            return 0
        prefixed_keys = [self._key(k) for k in keys]
        return await self._client.exists(*prefixed_keys)

    async def expire(self, key: str, time: int) -> bool:
        return await self._client.expire(self._key(key), time)

    async def ttl(self, key: str) -> int:
        return await self._client.ttl(self._key(key))

    async def incr(self, key: str, amount: int = 1) -> int:
        return await self._client.incrby(self._key(key), amount)

    async def decr(self, key: str, amount: int = 1) -> int:
        return await self._client.decrby(self._key(key), amount)

    async def hget(self, name: str, key: str) -> Any:
        return await self._client.hget(self._key(name), key)

    async def hset(
        self, name: str, key: str = None, value: str = None, mapping: dict = None
    ) -> int:
        return await self._client.hset(
            self._key(name), key=key, value=value, mapping=mapping
        )

    async def hgetall(self, name: str) -> dict:
        return await self._client.hgetall(self._key(name))

    async def hdel(self, name: str, *keys: str) -> int:
        return await self._client.hdel(self._key(name), *keys)


def get_tenant_redis(redis: Redis, business_id: str) -> TenantRedis:
    """Helper function to obtain a tenant-bound Redis wrapper context."""
    return TenantRedis(redis, business_id)
