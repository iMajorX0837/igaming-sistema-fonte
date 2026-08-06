#!/usr/bin/env bash
# Reaplica serviço docker-compose + nginx após git reset (tenants extras não vão no git).
# Uso: ./scripts/ensure-tenant-compose.sh pixnarede
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TENANT="${1:-}"

if [[ -z "$TENANT" ]]; then
  echo "Uso: $0 <tenant>"
  exit 1
fi

ENV_API="$ROOT_DIR/tenants/$TENANT/env.api"
if [[ ! -f "$ENV_API" ]]; then
  echo "Erro: $ENV_API não existe."
  exit 1
fi

DOMAIN=""
if grep -q '^PUBLIC_SITE_URL=' "$ENV_API"; then
  DOMAIN="$(grep '^PUBLIC_SITE_URL=' "$ENV_API" | head -1 | cut -d= -f2- | tr -d '\r' | sed -E 's|^https?://||; s|/.*$||')"
fi

if [[ -z "$DOMAIN" ]]; then
  echo "Erro: PUBLIC_SITE_URL ausente em $ENV_API"
  exit 1
fi

bash "$ROOT_DIR/scripts/add-tenant.sh" "$TENANT" "$DOMAIN" >/dev/null
echo "OK: compose/nginx do tenant '$TENANT' ($DOMAIN) garantidos."
