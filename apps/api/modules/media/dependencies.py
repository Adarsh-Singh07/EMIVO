import os

from .adapter import S3CompatibleAdapter

# R2 credentials come from the environment; the endpoint is derived from the
# account id (R2 S3-compatible API).
r2_account_id = os.getenv("R2_ACCOUNT_ID", "")
r2_endpoint = os.getenv("R2_ENDPOINT_URL", f"https://{r2_account_id}.r2.cloudflarestorage.com")
r2_access_key = os.getenv("R2_ACCESS_KEY_ID", "")
r2_secret_key = os.getenv("R2_SECRET_ACCESS_KEY", "")
r2_bucket = os.getenv("R2_BUCKET_NAME", "elektrix-media")
r2_public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")

_adapter: "S3CompatibleAdapter | None" = None


def get_media_adapter():
    global _adapter
    if not (r2_account_id or r2_endpoint) or not r2_access_key or not r2_secret_key:
        return None
    if _adapter is None:
        _adapter = S3CompatibleAdapter(
            endpoint_url=r2_endpoint, access_key=r2_access_key, secret_key=r2_secret_key
        )
    return _adapter


def get_default_bucket() -> str:
    return r2_bucket


def get_r2_public_url() -> str:
    return r2_public_url
