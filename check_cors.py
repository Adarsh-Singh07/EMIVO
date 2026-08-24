import os, boto3
from botocore.exceptions import ClientError

account_id = os.environ.get("R2_ACCOUNT_ID")
access_key = os.environ.get("R2_ACCESS_KEY_ID")
secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
bucket = os.environ.get("R2_BUCKET_NAME")

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="auto"
)

try:
    response = s3.get_bucket_cors(Bucket=bucket)
    print("CORS Config:", response.get('CORSRules'))
except ClientError as e:
    if e.response['Error']['Code'] == 'NoSuchCORSConfiguration':
        print("No CORS configuration found on the bucket.")
    else:
        print(f"Error checking CORS: {e}")
