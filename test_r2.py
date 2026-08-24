import os
import boto3
from dotenv import load_dotenv

load_dotenv("/opt/elektrix/.env")

account_id = os.environ.get("R2_ACCOUNT_ID")
access_key = os.environ.get("R2_ACCESS_KEY_ID")
secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
bucket = os.environ.get("R2_BUCKET_NAME")

print(f"Account ID: {account_id}")
print(f"Bucket: {bucket}")
print(f"Access Key: {access_key}")
print(f"Secret Key: {secret_key[:5]}..." if secret_key else "Missing secret")

if not access_key or access_key.startswith("your_production"):
    print("Invalid placeholder credentials.")
    exit(1)

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="auto"
)

try:
    s3.list_objects_v2(Bucket=bucket, MaxKeys=1)
    print("Successfully connected to R2 and accessed bucket!")
except Exception as e:
    print(f"Failed: {e}")
    exit(1)
