"""Amazon S3 adapter using the default Boto3 credential provider chain."""

import asyncio
from typing import Any
from uuid import uuid4

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.integrations.errors import ObjectStorageError
from app.integrations.storage import StoredObject


class S3ObjectStorage:
    def __init__(
        self,
        *,
        bucket_name: str,
        aws_region: str | None = None,
        object_prefix: str = "reports",
        presigned_url_expire_seconds: int = 900,
        client: Any | None = None,
    ) -> None:
        if not bucket_name.strip():
            raise ValueError("S3 bucket_name이 필요합니다.")
        if presigned_url_expire_seconds <= 0:
            raise ValueError("Presigned URL 만료 시간은 0보다 커야 합니다.")
        self._bucket_name = bucket_name
        self._object_prefix = object_prefix.strip("/")
        self._presigned_url_expire_seconds = presigned_url_expire_seconds
        self._client = client or boto3.client("s3", region_name=aws_region)

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
        try:
            await asyncio.to_thread(
                self._client.put_object,
                Bucket=self._bucket_name,
                Key=object_key,
                Body=content,
                ContentType=content_type,
                IfNoneMatch="*",
            )
        except (BotoCoreError, ClientError) as exc:
            raise ObjectStorageError("upload", "신고 사진 저장에 실패했습니다.") from exc
        return StoredObject(object_key=object_key)

    async def delete(self, object_key: str) -> None:
        try:
            await asyncio.to_thread(
                self._client.delete_object,
                Bucket=self._bucket_name,
                Key=object_key,
            )
        except (BotoCoreError, ClientError) as exc:
            raise ObjectStorageError("delete", "신고 사진 삭제에 실패했습니다.") from exc

    def create_download_url(self, object_key: str) -> str:
        try:
            return self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket_name, "Key": object_key},
                ExpiresIn=self._presigned_url_expire_seconds,
            )
        except (BotoCoreError, ClientError) as exc:
            raise ObjectStorageError(
                "create-download-url",
                "신고 사진 조회 URL 생성에 실패했습니다.",
            ) from exc
