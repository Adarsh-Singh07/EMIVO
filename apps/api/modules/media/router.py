import os
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from models.user import User  # Assuming standard location
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security_deps import get_current_user

from . import models, schemas
from .adapter import S3CompatibleAdapter
from .dependencies import get_default_bucket, get_media_adapter

router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/presigned-upload", response_model=schemas.PresignedUploadResponse)
async def create_presigned_upload(
    req: schemas.PresignedUploadRequest,
    db: AsyncSession = Depends(get_db),
    adapter: S3CompatibleAdapter = Depends(get_media_adapter),
    bucket: str = Depends(get_default_bucket),
    current_user: User = Depends(get_current_user),
):
    business_id = (
        str(current_user.business_id)
        if hasattr(current_user, "business_id")
        else current_user.tenant_id
    )
    if not business_id:
        raise HTTPException(
            status_code=400, detail="User must belong to a business to upload media"
        )

    ext = os.path.splitext(req.filename)[1]
    unique_id = uuid.uuid4()
    key = f"{business_id}/{int(time.time())}_{unique_id}{ext}"

    upload_url = adapter.generate_presigned_upload_url(
        bucket_name=bucket, object_name=key, content_type=req.content_type
    )

    if not upload_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate upload URL",
        )

    media_ref = models.MediaRef(
        id=unique_id,
        business_id=business_id,
        provider="r2",
        bucket=bucket,
        key=key,
        content_type=req.content_type,
        size_bytes=req.size_bytes,
        filename=req.filename,
    )

    db.add(media_ref)
    await db.commit()
    await db.refresh(media_ref)

    return schemas.PresignedUploadResponse(
        media_id=media_ref.id, upload_url=upload_url, key=key, provider="r2"
    )


@router.get("/{media_id}/url")
async def get_media_url(
    media_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    adapter: S3CompatibleAdapter = Depends(get_media_adapter),
):
    result = await db.get(models.MediaRef, media_id)
    if not result:
        raise HTTPException(status_code=404, detail="Media not found")

    url = adapter.generate_presigned_download_url(
        bucket_name=result.bucket, object_name=result.key
    )

    return {"url": url}
