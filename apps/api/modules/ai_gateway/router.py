import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db_session

# In a real app we would get the current user out of dependencies
# from core.security_deps import get_current_user
from .schemas import ChatRequest, ChatResponse, ErrorResponse
from .service import ai_gateway_service

router = APIRouter(prefix="/ai", tags=["ai-gateway"])
logger = logging.getLogger(__name__)


@router.post(
    "/chat", response_model=ChatResponse, responses={400: {"model": ErrorResponse}}
)
async def chat_completion(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db_session),
    # current_user = Depends(get_current_user)
) -> Any:
    """
    Generate chat completions routing to different AI models based on request.
    Handles rate-limiting and usage tracking.
    """
    try:
        # Mocking user_id/business_id since we disabled auth dependency for this snippet
        user_id = 1
        business_id = None

        response = await ai_gateway_service.process_chat(
            request=request, db=db, user_id=user_id, business_id=business_id
        )
        return response

    except Exception as e:
        logger.error(f"Chat completion error: {e!s}")
        raise HTTPException(status_code=400, detail=str(e))
