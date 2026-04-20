from typing import Optional
from supabase import Client
from utils.logging import Logger

logger = Logger("StorageService")

class StorageService:
    def __init__(self, supabase: Client, bucket_name: str):
        """
        StorageService initialized with a Supabase client and a target bucket.
        """
        self.supabase = supabase
        self.bucket_name = bucket_name

    def get_signed_url(self, storage_path: str, expires_in_seconds: int = 3600) -> Optional[str]:
        try:
            response = (
                self.supabase.storage
                .from_(self.bucket_name)
                .create_signed_url(storage_path, expires_in_seconds)
            )
            return response.get("signedURL") or response.get("signedUrl")
        except Exception as exc:
            logger.logger.exception(
                "Failed to create signed URL",
                extra={"bucket": self.bucket_name, "storage_path": storage_path, "error": str(exc)},
            )
            return None

    def upload_file(self, storage_path: str, content: bytes, content_type: str = "image/jpeg"):
        try:
            return (
                self.supabase.storage
                .from_(self.bucket_name)
                .upload(
                    path=storage_path,
                    file=content,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
            )
        except Exception as exc:
            logger.logger.exception(
                "Failed to upload file",
                extra={"bucket": self.bucket_name, "storage_path": storage_path, "error": str(exc)},
            )
            raise
