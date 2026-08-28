from pydantic import BaseModel, Field

class PresignedUploadRequest(BaseModel):
    filename: str = Field(..., max_length=255)
    content_type: str = Field(..., pattern=r"^image/.*$")
    size_bytes: int = Field(..., gt=0, le=25 * 1024 * 1024)  # 25 MB cap

class PresignedUploadResponse(BaseModel):
    """Upload with `upload_url` (PUT, content-type must match), then use
    `public_url` as the product media URL."""
    upload_url: str
    public_url: str
    key: str
    provider: str = "r2"
