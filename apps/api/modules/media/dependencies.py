import os

from .adapter import S3CompatibleAdapter

# R2 config should ideally be in Settings, but accessing via os.getenv/Config as fallback
r2_endpoint = os.getenv(
    "R2_ENDPOINT_URL", "https://your-account-id.r2.cloudflarestorage.com"
)
r2_access_key = os.getenv("R2_ACCESS_KEY_ID", "default_key")
r2_secret_key = os.getenv("R2_SECRET_ACCESS_KEY", "default_secret")
r2_bucket = os.getenv("R2_BUCKET_NAME", "elektrix-media")

media_adapter = S3CompatibleAdapter(
    endpoint_url=r2_endpoint, access_key=r2_access_key, secret_key=r2_secret_key
)


def get_media_adapter():
    return media_adapter


def get_default_bucket():
    return r2_bucket
