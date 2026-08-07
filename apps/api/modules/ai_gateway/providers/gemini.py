import logging
import os

import google.generativeai as genai

from ..schemas import ChatMessage, UsageStats
from .base import AIProvider

logger = logging.getLogger(__name__)


class GeminiProvider(AIProvider):
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.default_model = "gemini-1.5-flash"

    @property
    def name(self) -> str:
        return "gemini"

    def _convert_messages(self, messages: list[ChatMessage]) -> list[dict]:
        """Convert standard messages format to Gemini format"""
        gemini_msgs = []
        for msg in messages:
            role = "model" if msg.role == "assistant" else msg.role
            role = (
                "user" if role == "system" else role
            )  # Gemini doesn't have strict system role in chat history

            gemini_msgs.append({"role": role, "parts": [msg.content]})
        return gemini_msgs

    async def chat_completion(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> tuple[ChatMessage, UsageStats]:

        model_name = model or self.default_model

        try:
            gen_model = genai.GenerativeModel(model_name)

            # Simple conversion for now, full implementation would handle system instructions properly
            chat_history = self._convert_messages(messages[:-1])
            current_msg = messages[-1].content

            chat = gen_model.start_chat(history=chat_history)

            generation_config = genai.types.GenerationConfig(
                temperature=temperature, max_output_tokens=max_tokens
            )

            response = chat.send_message(
                current_msg, generation_config=generation_config
            )

            # Estimate usage since Gemini SDK doesn't always provide it reliably
            # Mock usage for now based on text length
            prompt_text_len = sum(len(m.content) for m in messages)
            resp_text_len = len(response.text)

            usage = UsageStats(
                prompt_tokens=int(prompt_text_len / 4),  # rough estimate
                completion_tokens=int(resp_text_len / 4),
                total_tokens=int((prompt_text_len + resp_text_len) / 4),
            )

            return ChatMessage(role="assistant", content=response.text), usage

        except Exception as e:
            logger.error(f"Gemini API error: {e!s}")
            raise e
