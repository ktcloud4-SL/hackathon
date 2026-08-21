import pytest

from app.core.config import Settings


BUCKET_ENV_NAMES = ("S3_BUCKET", "STORAGE_BUCKET", "S3_BUCKET_NAME")
PREFIX_ENV_NAMES = ("S3_PREFIX", "STORAGE_PREFIX")


@pytest.mark.parametrize("env_name", BUCKET_ENV_NAMES)
def test_s3_bucket_accepts_current_and_legacy_env_names(
    monkeypatch: pytest.MonkeyPatch,
    env_name: str,
) -> None:
    for name in BUCKET_ENV_NAMES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(env_name, "one-report-images")

    settings = Settings()

    assert settings.s3_bucket == "one-report-images"


@pytest.mark.parametrize("env_name", PREFIX_ENV_NAMES)
def test_s3_prefix_accepts_current_and_legacy_env_names(
    monkeypatch: pytest.MonkeyPatch,
    env_name: str,
) -> None:
    for name in PREFIX_ENV_NAMES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(env_name, "incoming-reports")

    settings = Settings()

    assert settings.s3_prefix == "incoming-reports"


def test_s3_endpoint_url_is_available_for_local_minio(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("S3_ENDPOINT_URL", "http://127.0.0.1:59000")

    settings = Settings()

    assert settings.s3_endpoint_url == "http://127.0.0.1:59000"
