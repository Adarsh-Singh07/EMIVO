"""Audit trail API (staff only).

Read-only: the trail is append-only, so there is deliberately no write or
delete endpoint. Mutations are recorded by the services that perform them.
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import set_db_context, require_staff
from modules.audit.service import AuditService
from modules.users.models import User

router = APIRouter(prefix="/api/v1/admin/audit", tags=["Audit"])


async def get_audit_service(
    session: AsyncSession = Depends(set_db_context),
) -> AuditService:
    return AuditService(session)


@router.get("", summary="Search the audit trail")
async def search_audit(
    entity_type: Optional[str] = Query(None, max_length=60),
    entity_id: Optional[str] = Query(None, max_length=64),
    actor_id: Optional[str] = Query(None, max_length=64),
    action: Optional[str] = Query(None, max_length=80),
    status: Optional[str] = Query(None, max_length=20),
    severity: Optional[str] = Query(None, max_length=20),
    since: Optional[str] = Query(None, description="ISO timestamp, inclusive"),
    until: Optional[str] = Query(None, description="ISO timestamp, inclusive"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    service: AuditService = Depends(get_audit_service),
    current_user: User = Depends(require_staff),
) -> Any:
    return await service.search(
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        action=action,
        status=status,
        severity=severity,
        since=since,
        until=until,
        limit=limit,
        offset=offset,
    )


@router.get("/entity/{entity_type}/{entity_id}", summary="Audit history for one entity")
async def entity_history(
    entity_type: str,
    entity_id: str,
    limit: int = Query(50, ge=1, le=200),
    service: AuditService = Depends(get_audit_service),
    current_user: User = Depends(require_staff),
) -> Any:
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "items": await service.history_for(entity_type, entity_id, limit=limit),
    }
