from typing import Any

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the sender (user, assistant, system)")
    content: str = Field(..., description="Content of the message")


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    provider: str | None = Field(
        "auto", description="Provider to use (auto, gemini, openrouter)"
    )
    model: str | None = Field(None, description="Specific model to use (optional)")
    temperature: float | None = 0.7
    max_tokens: int | None = None
    stream: bool | None = False


class UsageStats(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatResponse(BaseModel):
    message: ChatMessage
    provider_used: str
    model_used: str
    usage: UsageStats | None = None


class ErrorResponse(BaseModel):
    error: str
    details: Any | None = None
