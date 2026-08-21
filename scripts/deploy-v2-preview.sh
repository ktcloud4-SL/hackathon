#!/usr/bin/env bash
set -Eeuo pipefail

readonly EXPECTED_DIR="/opt/onereport-v2-preview"
readonly PREVIEW_BRANCH="experiment/public-report-v2-full"
readonly COMPOSE_PROJECT="onereport-v2-preview"
readonly COMPOSE_FILE="docker-compose.v2.preview.yml"
readonly ENV_FILE=".env.v2.preview"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

[[ "$(pwd -P)" == "$EXPECTED_DIR" ]] || fail "Run this script from $EXPECTED_DIR"
[[ "$(git branch --show-current)" == "$PREVIEW_BRANCH" ]] || fail "Expected branch: $PREVIEW_BRANCH"
git diff --quiet && git diff --cached --quiet || fail "Tracked working tree changes must be committed before deployment."

command -v docker >/dev/null 2>&1 || fail "docker is required."
docker compose version >/dev/null 2>&1 || fail "docker compose v2 is required."
command -v curl >/dev/null 2>&1 || fail "curl is required."

if [[ ! -f "$ENV_FILE" ]]; then
  : "${V2_PREVIEW_HOST:?Set V2_PREVIEW_HOST to the EC2 public IP or DNS name (without scheme or port).}"
  : "${V2_POSTGRES_PASSWORD:?Set V2_POSTGRES_PASSWORD.}"
  : "${V2_JWT_SECRET:?Set V2_JWT_SECRET.}"
  : "${V2_MINIO_SECRET_KEY:?Set V2_MINIO_SECRET_KEY.}"

  [[ "$V2_PREVIEW_HOST" != *://* && "$V2_PREVIEW_HOST" != *:* && "$V2_PREVIEW_HOST" != */* ]] ||
    fail "V2_PREVIEW_HOST must not contain a scheme, port, or path."
  [[ "$V2_POSTGRES_PASSWORD" =~ ^[A-Za-z0-9_-]+$ ]] ||
    fail "Use only letters, digits, underscore, and hyphen in V2_POSTGRES_PASSWORD."
  [[ "$V2_JWT_SECRET" =~ ^[A-Za-z0-9_-]+$ ]] ||
    fail "Use a base64url/hex-style V2_JWT_SECRET without spaces or shell metacharacters."
  [[ "$V2_MINIO_SECRET_KEY" =~ ^[A-Za-z0-9_-]+$ ]] ||
    fail "Use only letters, digits, underscore, and hyphen in V2_MINIO_SECRET_KEY."
  (( ${#V2_JWT_SECRET} >= 32 )) || fail "V2_JWT_SECRET must contain at least 32 characters."
  (( ${#V2_MINIO_SECRET_KEY} >= 16 )) || fail "V2_MINIO_SECRET_KEY must contain at least 16 characters."

  umask 077
  {
    printf 'V2_PREVIEW_HOST=%s\n' "$V2_PREVIEW_HOST"
    printf 'V2_POSTGRES_USER=%s\n' "${V2_POSTGRES_USER:-onereport_v2_preview}"
    printf 'V2_POSTGRES_PASSWORD=%s\n' "$V2_POSTGRES_PASSWORD"
    printf 'V2_POSTGRES_DB=%s\n' "${V2_POSTGRES_DB:-onereport_v2_preview}"
    printf 'V2_JWT_SECRET=%s\n' "$V2_JWT_SECRET"
    printf 'V2_MINIO_ACCESS_KEY=%s\n' "${V2_MINIO_ACCESS_KEY:-onereport_v2_preview}"
    printf 'V2_MINIO_SECRET_KEY=%s\n' "$V2_MINIO_SECRET_KEY"
    printf 'V2_MINIO_BUCKET=%s\n' "${V2_MINIO_BUCKET:-onereport-v2-preview-images}"
  } > "$ENV_FILE"
  echo "[PASS] Created private preview environment file: $EXPECTED_DIR/$ENV_FILE"
fi

git fetch origin "$PREVIEW_BRANCH"
git merge --ff-only "origin/$PREVIEW_BRANCH"

compose=(docker compose --project-name "$COMPOSE_PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
"${compose[@]}" config --quiet
"${compose[@]}" up -d --build --remove-orphans

wait_for_url() {
  local label="$1"
  local url="$2"
  local attempt
  for attempt in $(seq 1 60); do
    if curl --fail --silent --show-error --max-time 3 "$url" >/dev/null; then
      echo "[PASS] $label: $url"
      return 0
    fi
    sleep 2
  done
  "${compose[@]}" ps >&2
  "${compose[@]}" logs --tail=100 backend frontend >&2
  fail "$label did not become healthy: $url"
}

wait_for_url "V2 frontend" "http://127.0.0.1:18080/"
wait_for_url "V2 API" "http://127.0.0.1:18080/api/health"

preview_host="$(sed -n 's/^V2_PREVIEW_HOST=//p' "$ENV_FILE" | tail -n 1)"
echo "FINAL: PASS"
echo "V2 Preview: http://${preview_host}:18080"
