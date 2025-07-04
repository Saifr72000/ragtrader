from google.cloud import storage
from google.oauth2 import service_account
from dotenv import load_dotenv
import os
import json
import uuid

# Load environment variables from .env file
load_dotenv()

def upload_image_to_gcs(image_bytes, bucket_name, folder="images"):
    # Retrieve credentials JSON from env
    credentials_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if credentials_json is None:
        raise ValueError("Missing GOOGLE_CREDENTIALS_JSON environment variable in .env file.")

    try:
        service_account_info = json.loads(credentials_json)
    except json.JSONDecodeError as e:
        raise ValueError("Invalid JSON format in GOOGLE_CREDENTIALS_JSON environment variable.") from e

    # Authenticate with GCS
    credentials = service_account.Credentials.from_service_account_info(service_account_info)
    client = storage.Client(credentials=credentials, project=service_account_info["project_id"])
    
    # Upload the image
    bucket = client.bucket(bucket_name)
    filename = f"{folder}/{uuid.uuid4()}.png"
    blob = bucket.blob(filename)
    blob.upload_from_string(image_bytes, content_type="image/png")
    
    return blob.public_url
