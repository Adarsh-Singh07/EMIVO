from abc import ABC, abstractmethod

from ..schemas import ChatMessage, UsageStats


class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> tuple[ChatMessage, UsageStats]:
        """
        Generate a chat completion.
        Returns a tuple of (response_message, usage_stats)
        """
