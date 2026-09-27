import logging

import boto3
import httpx
from botocore.config import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class S3CompatibleAdapter:
    def __init__(
        self, endpoint_url: str, access_key: str, secret_key: str, region: str = "auto"
    ):
        self.endpoint_url = endpoint_url
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version="s3v4"),
        )

    def generate_presigned_upload_url(
        self, bucket_name: str, object_name: str, expiration=3600, content_type=None
    ):
        try:
            params = {
                "Bucket": bucket_name,
                "Key": object_name,
            }
            if content_type:
                params["ContentType"] = content_type

            response = self.client.generate_presigned_url(
                "put_object", Params=params, ExpiresIn=expiration
            )
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None
        return response

    def generate_presigned_download_url(
        self, bucket_name: str, object_name: str, expiration=3600
    ):
        try:
            response = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket_name, "Key": object_name},
                ExpiresIn=expiration,
            )
        except ClientError as e:
            logger.error(f"Error generating presigned download URL: {e}")
            return None
        return response

    def upload_bytes(
        self, bucket_name: str, object_name: str, data: bytes, content_type: str | None = None
    ) -> bool:
        """Server-side PUT (browser never talks to the R2 S3 endpoint).

        The request is signed offline by boto3 (SigV4 presigned URL) and sent
        with httpx: the R2 S3 edge rejects urllib3/botocore's TLS handshake
        from some networks (APAC, Sep 2026) while accepting httpx's. During
        Cloudflare's APAC degradation the edge also flaps per-connection, so
        each attempt gets a fresh presigned URL and we retry a few times with
        backoff. Any total failure returns False — the router treats that as
        the trigger for the api.cloudflare.com REST fallback."""
        import time

        headers = {"Content-Type": content_type} if content_type else None
        last_err = "no attempts made"
        for attempt in range(4):
            try:
                params: dict = {"Bucket": bucket_name, "Key": object_name}
                if content_type:
                    params["ContentType"] = content_type
                url = self.client.generate_presigned_url(
                    "put_object", Params=params, ExpiresIn=300
                )
                resp = httpx.put(url, content=data, headers=headers, timeout=30)
                if resp.status_code == 200:
                    if attempt:
                        logger.info(f"R2 upload of {object_name} succeeded on attempt {attempt + 1}")
                    return True
                last_err = f"PUT returned {resp.status_code}: {resp.text[:120]}"
            except Exception as e:  # noqa: BLE001 - any S3 failure must fall through
                last_err = f"{type(e).__name__}: {e}"
            time.sleep(0.4 * (attempt + 1))
        logger.error(f"R2 upload of {object_name} failed after 4 attempts: {last_err}")
        return False
