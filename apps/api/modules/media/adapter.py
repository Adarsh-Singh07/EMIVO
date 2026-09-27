import logging
import time

import boto3
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
            config=Config(
                signature_version="s3v4",
                # CRITICAL: path-style addressing. boto3's default virtual-host
                # style produces URLs like
                #   elektrix-media.<account>.r2.cloudflarestorage.com
                # — a two-level-deep subdomain that Cloudflare's
                # *.r2.cloudflarestorage.com certificate does NOT cover, so
                # every TLS handshake to it dies with handshake_failure
                # (browsers saw ERR_SSL_VERSION_OR_CIPHER_MISMATCH). Path
                # style keeps the bucket in the path under the covered host.
                s3={"addressing_style": "path"},
            ),
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

        Retries with backoff: the R2 edge intermittently drops connections
        (Cloudflare APAC degradation, Sep 2026). Total failure returns False,
        which the router treats as the trigger for the api.cloudflare.com
        REST fallback."""
        last_err = "no attempts made"
        for attempt in range(3):
            try:
                params: dict = {"Bucket": bucket_name, "Key": object_name, "Body": data}
                if content_type:
                    params["ContentType"] = content_type
                self.client.put_object(**params)
                if attempt:
                    logger.info(f"R2 upload of {object_name} succeeded on attempt {attempt + 1}")
                return True
            except Exception as e:  # noqa: BLE001 - any S3 failure must fall through
                last_err = f"{type(e).__name__}: {e}"
            time.sleep(2 * (attempt + 1))
        logger.error(f"R2 upload of {object_name} failed after 3 attempts: {last_err}")
        return False
