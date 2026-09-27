import logging

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

        Catches everything (not just ClientError): an unreachable endpoint
        raises SSLError/EndpointConnectionError, and the router relies on a
        False return — not an exception — to trigger the REST fallback."""
        try:
            params: dict = {"Bucket": bucket_name, "Key": object_name, "Body": data}
            if content_type:
                params["ContentType"] = content_type
            self.client.put_object(**params)
            return True
        except Exception as e:  # noqa: BLE001 - any S3 failure must fall through
            logger.error(f"R2 S3 upload of {object_name} failed: {type(e).__name__}: {e}")
            return False
