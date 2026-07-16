#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Subindo todos os tenants definidos no compose (profile: all)"
docker compose --profile all build
docker compose --profile all up -d

echo
echo "Plataforma no ar."
docker compose ps
