import os
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from core.dependencies import require_staff
from modules.media.dependencies import (
    get_default_bucket,
    get_media_adapter,
    get_r2_public_url,
)
from modules.media.schemas import PresignedUploadRequest, PresignedUploadResponse

router = APIRouter(prefix="/api/v1/media", tags=["media"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}


@router.post(
    "/presign",
    response_model=PresignedUploadResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_staff)],
)
async def create_presigned_upload(
    req: PresignedUploadRequest,
    adapter=Depends(get_media_adapter),
    bucket: str = Depends(get_default_bucket),
):
    """Staff-only presigned R2 upload for product images. The browser PUTs the
    file directly to R2 with this URL (credentials never reach the client);
    the public CDN URL is returned for attaching to a product."""
    if adapter is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Media storage is not configured",
        )

    ext = os.path.splitext(req.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'")

    key = f"products/{int(time.time())}_{uuid.uuid4().hex}{ext}"
    upload_url = adapter.generate_presigned_upload_url(
        bucket_name=bucket, object_name=key, content_type=req.content_type
    )
    if not upload_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate upload URL",
        )

    public_url = f"{get_r2_public_url()}/{key}"
    return PresignedUploadResponse(
        upload_url=upload_url, public_url=public_url, key=key, provider="r2"
    )
