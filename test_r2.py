import os
import boto3
from botocore.config import Config
import requests

account_id = os.getenv("R2_ACCOUNT_ID")
endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
access = os.getenv("R2_ACCESS_KEY_ID")
secret = os.getenv("R2_SECRET_ACCESS_KEY")

client = boto3.client(
    "s3",
    endpoint_url=endpoint,
    aws_access_key_id=access,
    aws_secret_access_key=secret,
    region_name="auto",
    config=Config(signature_version="s3v4")
)

url = client.generate_presigned_url(
    "put_object",
    Params={"Bucket": "elektrix-media", "Key": "products/test.txt", "ContentType": "text/plain"},
    ExpiresIn=3600
)

print(url)

res = requests.put(url, data=b"hello", headers={"Content-Type": "text/plain"})
print(res.status_code, res.text)
