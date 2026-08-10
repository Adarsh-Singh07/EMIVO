import logging
import os

import httpx

from ..schemas import ChatMessage, UsageStats
from .base import AIProvider

logger = logging.getLogger(__name__)


class OpenRouterProvider(AIProvider):
    def __init__(self):
        self.api_key = os.environ.get("OPENROUTER_API_KEY")
        self.base_url = "https://openrouter.ai/api/v1"
        self.default_model = "meta-llama/llama-3-8b-instruct"

    @property
    def name(self) -> str:
        return "openrouter"

    async def chat_completion(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> tuple[ChatMessage, UsageStats]:

        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not set")

        model_name = model or self.default_model

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://elektrix.in",
            "X-Title": "ELEKTRIX Platform",
        }

        payload = {
            "model": model_name,
            "messages": [msg.model_dump() for msg in messages],
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30.0,
                )

                response.raise_for_status()
                data = response.json()

                resp_msg = data["choices"][0]["message"]
                usage_data = data.get("usage", {})

                usage = UsageStats(
                    prompt_tokens=usage_data.get("prompt_tokens", 0),
                    completion_tokens=usage_data.get("completion_tokens", 0),
                    total_tokens=usage_data.get("total_tokens", 0),
                )

                return ChatMessage(
                    role=resp_msg["role"], content=resp_msg["content"]
                ), usage

        except Exception as e:
            logger.error(f"OpenRouter API error: {e!s}")
            raise e
