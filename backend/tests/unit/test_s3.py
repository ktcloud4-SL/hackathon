from datetime import datetime, timezone
from typing import Any

import pytest
from botocore.exceptions import ClientError

from app.integrations.errors import ObjectStorageError
from app.integrations.s3 import S3ObjectStorage
from app.models import Report
from app.services.incidents import report_view


class FakeS3Client:
    def __init__(self, *, fail_upload: bool = False) -> None:
        self.fail_upload = fail_upload
        self.uploaded: dict[str, Any] | None = None
        self.deleted: dict[str, str] | None = None
        self.presigned: dict[str, Any] | None = None

    def put_object(self, **kwargs: Any) -> None:
        if self.fail_upload:
            raise ClientError(
                {"Error": {"Code": "InternalError", "Message": "upload failed"}},
                "PutObject",
            )
        self.uploaded = kwargs

    def delete_object(self, **kwargs: str) -> None:
        self.deleted = kwargs

    def generate_presigned_url(
        self,
        operation: str,
        *,
        Params: dict[str, str],
        ExpiresIn: int,
    ) -> str:
        self.presigned = {
            "operation": operation,
            "Params": Params,
            "ExpiresIn": ExpiresIn,
        }
        return f"https://example.test/{Params['Key']}?signature=test"


@pytest.mark.asyncio
async def test_upload_uses_unique_key_and_create_only_precondition() -> None:
    client = FakeS3Client()
    adapter = S3ObjectStorage(
        bucket_name="one-report-images",
        object_prefix="reports",
        client=client,
    )

    stored = await adapter.upload(
        content=b"image-content",
        filename="citizen-photo.jpg",
        content_type="image/jpeg",
    )

    assert stored.object_key.startswith("reports/")
    assert client.uploaded == {
        "Bucket": "one-report-images",
        "Key": stored.object_key,
        "Body": b"image-content",
        "ContentType": "image/jpeg",
        "IfNoneMatch": "*",
    }


@pytest.mark.asyncio
async def test_delete_removes_uploaded_object() -> None:
    client = FakeS3Client()
    adapter = S3ObjectStorage(bucket_name="one-report-images", client=client)
    stored = await adapter.upload(
        content=b"image-content",
        filename="photo.jpg",
        content_type="image/jpeg",
    )

    await adapter.delete(stored.object_key)

    assert client.deleted == {
        "Bucket": "one-report-images",
        "Key": stored.object_key,
    }


def test_create_download_url_uses_configured_expiration() -> None:
    client = FakeS3Client()
    adapter = S3ObjectStorage(
        bucket_name="one-report-images",
        presigned_url_expire_seconds=600,
        client=client,
    )

    url = adapter.create_download_url("reports/image-key")

    assert url == "https://example.test/reports/image-key?signature=test"
    assert client.presigned == {
        "operation": "get_object",
        "Params": {
            "Bucket": "one-report-images",
            "Key": "reports/image-key",
        },
        "ExpiresIn": 600,
    }


def test_report_view_exposes_presigned_url_instead_of_object_key() -> None:
    client = FakeS3Client()
    adapter = S3ObjectStorage(bucket_name="one-report-images", client=client)
    report = Report(
        id=1,
        reporter_user_id=2,
        description="신고 내용",
        address="서울시 강남구",
        latitude=37.5,
        longitude=127.0,
        image_object_key="reports/private-image-key",
        created_at=datetime.now(timezone.utc),
    )

    view = report_view(report, adapter)

    assert view.image_url == (
        "https://example.test/reports/private-image-key?signature=test"
    )
    assert view.image_url != report.image_object_key


@pytest.mark.asyncio
async def test_provider_failure_is_exposed_as_storage_error() -> None:
    client = FakeS3Client(fail_upload=True)
    adapter = S3ObjectStorage(bucket_name="one-report-images", client=client)

    with pytest.raises(ObjectStorageError) as exc_info:
        await adapter.upload(
            content=b"image-content",
            filename="photo.jpg",
            content_type="image/jpeg",
        )

    assert exc_info.value.operation == "upload"
