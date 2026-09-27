import logging
import os
import time
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from core.dependencies import require_staff
from modules.media.dependencies import (
    get_cloudflare_api_token,
    get_default_bucket,
    get_media_adapter,
    get_r2_account_id,
    get_r2_public_url,
)
from modules.media.rest_fallback import upload_via_cloudflare_api
from modules.media.schemas import MediaUploadResponse, PresignedUploadRequest, PresignedUploadResponse

logger = logging.getLogger(__name__)

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


MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # matches nginx client_max_body_size 20M


@router.post(
    "/upload",
    response_model=MediaUploadResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_staff)],
)
async def upload_media(
    file: UploadFile = File(...),
    adapter=Depends(get_media_adapter),
    bucket: str = Depends(get_default_bucket),
):
    """Server-proxied media upload. The browser sends the file HERE (same
    origin path as every other API call) and the backend writes it to R2 —
    the browser never touches the R2 S3 endpoint, whose TLS is unreachable
    from some networks/ISPs. Falls back to the Cloudflare REST API
    (api.cloudflare.com) when the S3 path fails and CLOUDFLARE_API_TOKEN is
    configured."""
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext or filename}'")

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_CONTENT_TYPES[ext]:
        raise HTTPException(
            status_code=400,
            detail=f"Content type '{content_type or 'missing'}' does not match extension '{ext}'",
        )

    if adapter is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Media storage is not configured",
        )

    chunks: list[bytes] = []
    received = 0
    while chunk := await file.read(1024 * 1024):
        received += len(chunk)
        if received > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds the 20 MB limit")
        chunks.append(chunk)
    data = b"".join(chunks)
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    key = f"products/{int(time.time())}_{uuid.uuid4().hex}{ext}"

    s3_ok = await run_in_threadpool(
        adapter.upload_bytes, bucket, key, data, content_type
    )
    if not s3_ok:
        token = get_cloudflare_api_token()
        if not token:
            logger.error("R2 S3 upload failed and no Cloudflare API token is configured")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "R2 S3 endpoint unreachable. Configure CLOUDFLARE_API_TOKEN "
                    "(R2 edit scope) to enable the api.cloudflare.com upload fallback."
                ),
            )
        ok, detail = await upload_via_cloudflare_api(
            token, get_r2_account_id(), bucket, key, data, content_type
        )
        if not ok:
            logger.error(f"R2 REST fallback failed for {key}: {detail}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Both R2 upload paths failed. {detail}",
            )
        logger.info(f"R2 upload via REST fallback succeeded for {key}")

    public_url = f"{get_r2_public_url()}/{key}"
    return MediaUploadResponse(public_url=public_url, key=key, provider="r2")
