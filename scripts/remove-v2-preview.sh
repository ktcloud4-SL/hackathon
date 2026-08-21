#!/usr/bin/env bash
set -Eeuo pipefail

readonly EXPECTED_DIR="/opt/onereport-v2-preview"
readonly COMPOSE_PROJECT="onereport-v2-preview"
readonly COMPOSE_FILE="docker-compose.v2.preview.yml"
readonly ENV_FILE=".env.v2.preview"

[[ "$(pwd -P)" == "$EXPECTED_DIR" ]] || {
  echo "[FAIL] Run this script from $EXPECTED_DIR" >&2
  exit 1
}
[[ -f "$ENV_FILE" ]] || {
  echo "[FAIL] Missing $EXPECTED_DIR/$ENV_FILE" >&2
  exit 1
}

compose=(docker compose --project-name "$COMPOSE_PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

case "${1:-}" in
  "")
    "${compose[@]}" down
    echo "[PASS] Preview containers and network removed; preview DB/MinIO volumes preserved."
    ;;
  --stop)
    "${compose[@]}" stop
    echo "[PASS] Preview containers stopped; containers and data preserved."
    ;;
  --delete-data)
    [[ "${V2_CONFIRM_DELETE_DATA:-}" == "onereport-v2-preview" ]] || {
      echo "[FAIL] Set V2_CONFIRM_DELETE_DATA=onereport-v2-preview to delete preview volumes." >&2
      exit 1
    }
    "${compose[@]}" down --volumes
    echo "[PASS] Preview containers, network, and preview-only volumes removed."
    ;;
  *)
    echo "Usage: $0 [--stop|--delete-data]" >&2
    exit 2
    ;;
esac
