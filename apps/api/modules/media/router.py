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

# SVG is deliberately excluded: it can carry <script> payloads and is served
# from the public R2 origin, making it a stored-XSS vector.
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".ico", ".heic", ".heif"}

# Server-verified content types per extension — the client-supplied
# content_type is honoured only when it matches, so text/html can never be
# signed into the bucket under an image extension.
ALLOWED_CONTENT_TYPES = {
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".webp": {"image/webp"},
    ".avif": {"image/avif"},
    ".gif": {"image/gif"},
    ".ico": {"image/x-icon", "image/vnd.microsoft.icon", "image/icon"},
    ".heic": {"image/heic", "image/heif"},
    ".heif": {"image/heic", "image/heif"},
}


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

    content_type = (req.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES[ext]:
        raise HTTPException(
            status_code=400,
            detail=f"Content type '{content_type or 'missing'}' does not match extension '{ext}'",
        )

    key = f"products/{int(time.time())}_{uuid.uuid4().hex}{ext}"
    upload_url = adapter.generate_presigned_upload_url(
        bucket_name=bucket, object_name=key, content_type=content_type
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
