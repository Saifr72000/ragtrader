from google.cloud import storage
import uuid

def upload_image_to_gcs(image_bytes, bucket_name, folder="images"):
    # Initialize the GCS client
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # Create a unique filename
    filename = f"{folder}/{uuid.uuid4()}.png"
    blob = bucket.blob(filename)

    # Upload the image
    blob.upload_from_string(image_bytes, content_type="image/png")

    # Make the file publicly accessible
    blob.make_public()

    # Return the public URL
    return blob.public_url