import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from .models import AIUsage
from .providers.base import AIProvider
from .providers.gemini import GeminiProvider
from .providers.openrouter import OpenRouterProvider
from .schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


class AIGatewayService:
    def __init__(self):
        self._providers: dict[str, AIProvider] = {
            "gemini": GeminiProvider(),
            "openrouter": OpenRouterProvider(),
        }
        # Concurrency limit (Semaphore) per worker instance
        self._concurrency_limit = asyncio.Semaphore(10)

    def _get_provider(self, provider_name: str) -> AIProvider:
        p_name = provider_name.lower()
        if p_name == "auto" or p_name not in self._providers:
            # Default to openrouter for general fallback or 'auto'
            return self._providers["openrouter"]
        return self._providers[p_name]

    async def _record_usage(
        self,
        db: AsyncSession,
        user_id: int | None,
        business_id: int | None,
        provider: str,
        model: str,
        usage_stats,
    ):
        try:
            usage_record = AIUsage(
                user_id=user_id,
                business_id=business_id,
                provider=provider,
                model_name=model,
                prompt_tokens=usage_stats.prompt_tokens,
                completion_tokens=usage_stats.completion_tokens,
                total_tokens=usage_stats.total_tokens,
                request_type="chat",
            )
            db.add(usage_record)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to record AI usage: {e!s}")
            await db.rollback()

    async def process_chat(
        self,
        request: ChatRequest,
        db: AsyncSession,
        user_id: int | None = None,
        business_id: int | None = None,
    ) -> ChatResponse:

        provider = self._get_provider(request.provider)

        # Enforce concurrency limit
        async with self._concurrency_limit:
            response_msg, usage_stats = await provider.chat_completion(
                messages=request.messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )

        # Determine actual model used mapping
        actual_model = request.model or getattr(provider, "default_model", "unknown")

        # Log usage metric in background or directly
        await self._record_usage(
            db=db,
            user_id=user_id,
            business_id=business_id,
            provider=provider.name,
            model=actual_model,
            usage_stats=usage_stats,
        )

        return ChatResponse(
            message=response_msg,
            provider_used=provider.name,
            model_used=actual_model,
            usage=usage_stats,
        )


# Singleton instance
ai_gateway_service = AIGatewayService()
