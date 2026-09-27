import logging
import os
import subprocess
import tempfile
import time

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

        The request is signed offline by boto3 (SigV4 presigned URL); the PUT
        itself alternates between httpx and curl. The R2 S3 edge currently
        rejects some TLS client fingerprints (this image's OpenSSL 3.5 sends
        post-quantum key shares; curl on OpenSSL 3.0 does not) and flaps
        per-connection during Cloudflare's APAC degradation — so we retry
        with backoff across both transports. Total failure returns False,
        which the router treats as the trigger for the api.cloudflare.com
        REST fallback."""
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
                if attempt % 2 == 0:
                    resp = httpx.put(url, content=data, headers=headers, timeout=30)
                    if resp.status_code == 200:
                        return True
                    last_err = f"httpx PUT returned {resp.status_code}: {resp.text[:120]}"
                else:
                    code = self._put_via_curl(url, data, content_type)
                    if code == 200:
                        return True
                    last_err = f"curl PUT returned {code}"
            except Exception as e:  # noqa: BLE001 - any S3 failure must fall through
                last_err = f"{type(e).__name__}: {e}"
            # The edge flaps in minute-scale windows; spread attempts so a
            # short bad window doesn't sink the upload. Total ≈ 25s, within
            # nginx's 60s proxy timeout.
            time.sleep([0, 5, 7, 8][min(attempt, 3)])
        logger.error(f"R2 upload of {object_name} failed after 4 attempts: {last_err}")
        return False

    @staticmethod
    def _put_via_curl(url: str, data: bytes, content_type: str | None) -> int:
        """PUT via the curl binary (different TLS fingerprint than Python)."""
        tmp = tempfile.NamedTemporaryFile(delete=False)
        try:
            tmp.write(data)
            tmp.close()
            cmd = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                   "--max-time", "60", "-X", "PUT"]
            if content_type:
                cmd += ["-H", f"Content-Type: {content_type}"]
            cmd += ["--data-binary", f"@{tmp.name}", url]
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
            try:
                return int(out.stdout.strip() or 0)
            except ValueError:
                logger.error(f"curl upload produced no status: {out.stderr[:120]}")
                return 0
        finally:
            os.unlink(tmp.name)
