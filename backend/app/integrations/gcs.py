"""Google Cloud Storage adapter using Application Default Credentials."""

import asyncio
from uuid import uuid4

from google.api_core.exceptions import GoogleAPICallError
from google.cloud import storage

from app.integrations.errors import ObjectStorageError
from app.integrations.storage import StoredObject


class GoogleCloudObjectStorage:
    def __init__(
        self,
        *,
        bucket_name: str,
        object_prefix: str = "reports",
        client: storage.Client | None = None,
    ) -> None:
        if not bucket_name.strip():
            raise ValueError("Cloud Storage bucket_name이 필요합니다.")
        self._bucket = (client or storage.Client()).bucket(bucket_name)
        self._object_prefix = object_prefix.strip("/")

    async def upload(
        self,
        *,
        content: bytes,
        filename: str,
        content_type: str,
    ) -> StoredObject:
        del filename  # Original filenames are not used as object keys.
        object_key = "/".join(
            part for part in (self._object_prefix, uuid4().hex) if part
        )
        blob = self._bucket.blob(object_key)
        try:
            await asyncio.to_thread(
                blob.upload_from_string,
                content,
                content_type=content_type,
                if_generation_match=0,
            )
        except GoogleAPICallError as exc:
            raise ObjectStorageError("upload", "신고 사진 저장에 실패했습니다.") from exc
        return StoredObject(object_key=object_key)

    async def delete(self, object_key: str) -> None:
        blob = self._bucket.blob(object_key)
        try:
            await asyncio.to_thread(blob.delete)
        except GoogleAPICallError as exc:
            raise ObjectStorageError("delete", "신고 사진 삭제에 실패했습니다.") from exc
