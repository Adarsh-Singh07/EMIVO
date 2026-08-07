import uuid

from pydantic import BaseModel


class PresignedUploadRequest(BaseModel):
    filename: str
    content_type: str
    size_bytes: int


class PresignedUploadResponse(BaseModel):
    media_id: uuid.UUID
    upload_url: str
    key: str
    provider: str


class MediaRefResponse(BaseModel):
    id: uuid.UUID
    provider: str
    bucket: str
    key: str
    content_type: str | None = None
    size_bytes: int | None = None
    filename: str | None = None
    url: str | None = None

    class Config:
        from_attributes = True
