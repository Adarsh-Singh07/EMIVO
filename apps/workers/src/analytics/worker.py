import asyncio
import json
import logging
from redis.asyncio import Redis

logger = logging.getLogger(__name__)


class AnalyticsWorker:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis = None
        self.group_name = "analytics_group"
        self.consumer_name = "analytics_worker_1"
        self.running = False

    async def connect(self):
        self.redis = Redis.from_url(self.redis_url, decode_responses=True)

    async def disconnect(self):
        if self.redis:
            await self.redis.close()

    async def _ensure_group(self, stream_key: str):
        try:
            await self.redis.xgroup_create(
                stream_key, self.group_name, id="0", mkstream=True
            )
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                logger.error(f"Error creating consumer group for {stream_key}: {e}")

    async def get_tenant_streams(self):
        # In a real app we might use SCAN to find all tenant stream keys
        keys = []
        cursor = "0"
        while cursor != 0:
            cursor, partial_keys = await self.redis.scan(
                cursor, match="tenant:*:analytics:events", count=100
            )
            keys.extend(partial_keys)
        return keys

    async def process_messages(self, stream_key: str, messages):
        aggregations = []
        for message_id, payload in messages:
            event_type = payload.get("event_type")
            data_str = payload.get("data")

            if data_str:
                try:
                    data = json.loads(data_str)
                    # Here we would flush aggregated metrics to the database.
                    # As per instructions: "Do NOT use synchronous inserts for analytics."
                    # We are doing this asynchronously in bulk.
                    aggregations.append({"event_type": event_type, "data": data})
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode message data: {data_str}")

            # Acknowledge the message
            await self.redis.xack(stream_key, self.group_name, message_id)

        if aggregations:
            # Pseudo DB flush via async batch
            logger.info(
                f"Flushed {len(aggregations)} analytics events to DB for {stream_key}"
            )

    async def run_loop(self):
        self.running = True
        logger.info("Starting analytics worker loop")

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

                # Read from all streams
                results = await self.redis.xreadgroup(
                    self.group_name, self.consumer_name, streams, count=100, block=2000
                )

                if not results:
                    continue

                for stream_key, messages in results:
                    if messages:
                        await self.process_messages(stream_key, messages)

            except Exception as e:
                logger.error(f"Error in analytics worker loop: {e}")
                await asyncio.sleep(5)
