import logging
from typing import Any, Dict
import asyncio
from redis.asyncio import Redis

# Using same pattern as AnalyticsWorker for Redis Streams
from apps.api.core.database import async_session_maker, tenant_context
from apps.api.modules.search.vectorstore import PostgresVectorStore

logger = logging.getLogger(__name__)

async def process_outbox_event_search(ctx: dict[Any, Any], tenant_id: str, event_type: str, payload: dict[str, Any]):
    """ARQ handler for scaling search indexing via outbox directly."""
    if event_type not in ["ProductUpdated", "ProductCreated"]:
        return
        
    token = tenant_context.set(tenant_id)
    try:
        logger.info(f"Search indexing {event_type} for tenant {tenant_id}: {payload}")
        mock_embedding = [0.1] * 1536  # Mock embedding for pgvector
        
        async with async_session_maker() as session:
            vector_store = PostgresVectorStore(session)
            doc = {
                "id": payload.get("id"),
                "product_id": payload.get("id"),
                "metadata": payload
            }
            await vector_store.add_documents([doc], [mock_embedding], business_id=tenant_id)
            
    except Exception as e:
        logger.error(f"Failed to process search {event_type} for tenant {tenant_id}: {e}")
        raise
    finally:
        tenant_context.reset(token)

class SearchStreamWorker:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis = None
        self.group_name = "search_group"
        self.consumer_name = "search_worker_1"
        self.running = False
        
    async def connect(self):
        self.redis = Redis.from_url(self.redis_url, decode_responses=True)
        
    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def _ensure_group(self, stream_key: str):
        try:
            await self.redis.xgroup_create(stream_key, self.group_name, id="0", mkstream=True)
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                logger.error(f"Error creating group for {stream_key}: {e}")

    async def get_tenant_streams(self):
        keys = []
        cursor = "0"
        while cursor != 0:
            cursor, partial_keys = await self.redis.scan(cursor, match="tenant:*:outbox:events", count=100)
            keys.extend(partial_keys)
        return keys

    async def process_messages(self, stream_key: str, messages):
        import json
        
        # Extract tenant_id from stream_key (e.g. tenant:123:outbox:events)
        parts = stream_key.split(":")
        tenant_id = parts[1] if len(parts) > 1 else "default"
        
        for message_id, payload in messages:
            event_type = payload.get("event_type")
            data_str = payload.get("data")
            
            if event_type in ["ProductUpdated", "ProductCreated"] and data_str:
                try:
                    data = json.loads(data_str)
                    
                    token = tenant_context.set(tenant_id)
                    try:
                        async with async_session_maker() as session:
                            vector_store = PostgresVectorStore(session)
                            doc = {
                                "id": data.get("id"),
                                "product_id": data.get("id"),
                                "metadata": data
                            }
                            # mock embedding
                            mock_embedding = [0.1] * 1536
                            await vector_store.add_documents([doc], [mock_embedding], business_id=tenant_id)
                    finally:
                        tenant_context.reset(token)
                        
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode search message data: {data_str}")
                except Exception as e:
                    logger.error(f"Error indexing search: {e}")
            
            await self.redis.xack(stream_key, self.group_name, message_id)

    async def run_loop(self):
        self.running = True
        logger.info("Starting search worker loop")
        
        while self.running:
            try:
                stream_keys = await self.get_tenant_streams()
                if not stream_keys:
                    await asyncio.sleep(5)
                    continue

                streams = {}
                for key in stream_keys:
                    await self._ensure_group(key)
                    streams[key] = ">"

                results = await self.redis.xreadgroup(
                    self.group_name,
                    self.consumer_name,
                    streams,
                    count=100,
                    block=2000
                )

                if not results:
                    continue

                for stream_key, messages in results:
                    if messages:
                        await self.process_messages(stream_key, messages)
            except Exception as e:
                logger.error(f"Error in search worker loop: {e}")
                await asyncio.sleep(5)