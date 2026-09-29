from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from dataclasses import dataclass

from core.dependencies import require_staff, set_db_context, get_current_user
from modules.users.models import User
from modules.admin_assistant.service import ask

router = APIRouter(prefix="/api/v1/admin/assistant", tags=["AdminAssistant"])


@dataclass
class AdminAssistantCtx:
    session: AsyncSession
    user: User


def get_context(
    session: AsyncSession = Depends(set_db_context),
    user: User = Depends(get_current_user),
) -> AdminAssistantCtx:
    return AdminAssistantCtx(session=session, user=user)


class AskIn(BaseModel):
    question: str = Field(..., min_length=1, max_length=800)
    history: list[dict] = Field(default_factory=list, max_length=20)


class AskOut(BaseModel):
    reply: str
    tools_called: list[str] = []
    model: str = ""
    read_only: bool = True


@router.post("", response_model=AskOut, dependencies=[Depends(require_staff)])
async def ask_endpoint(
    payload: AskIn,
    service_ctx: AdminAssistantCtx = Depends(get_context),
):
    """One assistant turn for an authenticated staff member. Read-only,
    rate-limited, audited. Customers never reach this (403 at the router)."""
    return await ask(
        session=service_ctx.session,
        admin_user=service_ctx.user,
        question=payload.question,
        history=payload.history,
    )
