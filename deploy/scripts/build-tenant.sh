#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"

usage() {
  echo "Uso: $0 <tenant>"
  echo "Exemplo: $0 zorbybet"
  exit 1
}

TENANT="${1:-}"
[[ -n "$TENANT" ]] || usage

TENANT_DIR="$ROOT_DIR/tenants/$TENANT"
FRONT_ENV="$TENANT_DIR/env.front"
ADMIN_ENV="$TENANT_DIR/env.admin"

if [[ ! -f "$FRONT_ENV" || ! -f "$ADMIN_ENV" ]]; then
  echo "Erro: crie $FRONT_ENV e $ADMIN_ENV antes do build."
  echo "Copie de tenants/_template/ e ajuste os domínios."
  exit 1
fi

mkdir -p "$TENANT_DIR/front" "$TENANT_DIR/admin"

load_env() {
  local file="$1"
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

echo "==> Build front: $TENANT"
load_env "$FRONT_ENV"
docker build \
  -f "$ROOT_DIR/Dockerfile.front" \
  --build-arg "VITE_API_BASE=${VITE_API_BASE}" \
  --build-arg "VITE_DEPOSIT_API_BASE=${VITE_DEPOSIT_API_BASE}" \
  --build-arg "VITE_PLAYFIVERS_API_BASE=${VITE_PLAYFIVERS_API_BASE}" \
  --build-arg "VITE_GAME_LAUNCH_URL=${VITE_GAME_LAUNCH_URL}" \
  -t "venuz-front-$TENANT:latest" \
  "$REPO_ROOT/VenuzBET - Front"

CID="$(docker create "venuz-front-$TENANT:latest")"
docker cp "$CID:/dist/." "$TENANT_DIR/front/"
docker rm "$CID" >/dev/null

echo "==> Build admin: $TENANT"
load_env "$ADMIN_ENV"
docker build \
  -f "$ROOT_DIR/Dockerfile.admin" \
  --build-arg "VITE_API_BASE=${VITE_API_BASE}" \
  --build-arg "VITE_PLAYFIVERS_API_BASE=${VITE_PLAYFIVERS_API_BASE}" \
  -t "venuz-admin-$TENANT:latest" \
  "$REPO_ROOT/AdminPainel"

CID="$(docker create "venuz-admin-$TENANT:latest")"
docker cp "$CID:/dist/." "$TENANT_DIR/admin/"
docker rm "$CID" >/dev/null

echo "==> OK: assets em tenants/$TENANT/front e tenants/$TENANT/admin"
