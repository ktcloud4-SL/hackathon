import pytest
from google.api_core.exceptions import GoogleAPICallError

from app.integrations.errors import ObjectStorageError
from app.integrations.gcs import GoogleCloudObjectStorage


class FakeBlob:
    def __init__(self, *, fail_upload: bool = False) -> None:
        self.fail_upload = fail_upload
        self.uploaded: tuple[bytes, str, int] | None = None
        self.deleted = False

    def upload_from_string(
        self,
        content: bytes,
        *,
        content_type: str,
        if_generation_match: int,
    ) -> None:
        if self.fail_upload:
            raise GoogleAPICallError("upload failed")
        self.uploaded = (content, content_type, if_generation_match)

    def delete(self) -> None:
        self.deleted = True


class FakeBucket:
    def __init__(self, *, fail_upload: bool = False) -> None:
        self.fail_upload = fail_upload
        self.blobs: dict[str, FakeBlob] = {}

    def blob(self, object_key: str) -> FakeBlob:
        return self.blobs.setdefault(
            object_key,
            FakeBlob(fail_upload=self.fail_upload),
        )


class FakeStorageClient:
    def __init__(self, *, fail_upload: bool = False) -> None:
        self.fake_bucket = FakeBucket(fail_upload=fail_upload)
        self.bucket_name: str | None = None

    def bucket(self, bucket_name: str) -> FakeBucket:
        self.bucket_name = bucket_name
        return self.fake_bucket


@pytest.mark.asyncio
async def test_upload_uses_unique_key_and_create_only_precondition() -> None:
    client = FakeStorageClient()
    adapter = GoogleCloudObjectStorage(
        bucket_name="one-report-images",
        object_prefix="reports",
        client=client,  # type: ignore[arg-type]
    )

    stored = await adapter.upload(
        content=b"image-content",
        filename="citizen-photo.jpg",
        content_type="image/jpeg",
    )
    blob = client.fake_bucket.blobs[stored.object_key]

    assert client.bucket_name == "one-report-images"
    assert stored.object_key.startswith("reports/")
    assert blob.uploaded == (b"image-content", "image/jpeg", 0)


@pytest.mark.asyncio
async def test_delete_removes_uploaded_object() -> None:
    client = FakeStorageClient()
    adapter = GoogleCloudObjectStorage(
        bucket_name="one-report-images",
        client=client,  # type: ignore[arg-type]
    )
    stored = await adapter.upload(
        content=b"image-content",
        filename="photo.jpg",
        content_type="image/jpeg",
    )

    await adapter.delete(stored.object_key)

    assert client.fake_bucket.blobs[stored.object_key].deleted


@pytest.mark.asyncio
async def test_provider_failure_is_exposed_as_storage_error() -> None:
    client = FakeStorageClient(fail_upload=True)
    adapter = GoogleCloudObjectStorage(
        bucket_name="one-report-images",
        client=client,  # type: ignore[arg-type]
    )

    with pytest.raises(ObjectStorageError) as exc_info:
        await adapter.upload(
            content=b"image-content",
            filename="photo.jpg",
            content_type="image/jpeg",
        )

    assert exc_info.value.operation == "upload"
