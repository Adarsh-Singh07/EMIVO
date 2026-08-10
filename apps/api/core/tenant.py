from fastapi import HTTPException, Request


async def require_tenant_context(request: Request):
    """
    Dependency that enforces a valid tenant context exists for the endpoint.
    Used for multi-tenant isolation.
    """
    tenant_id = request.headers.get("x-business-id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing x-business-id header")
    return tenant_id
