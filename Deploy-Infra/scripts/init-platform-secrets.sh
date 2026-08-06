#!/usr/bin/env bash
# Extrai secrets compartilhados de uma casa que já funciona → tenants/_shared/secrets.env
# Rode UMA VEZ na VPS:
#   ./scripts/init-platform-secrets.sh stewgaming
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="${1:-stewgaming}"
SRC="$ROOT_DIR/tenants/$SOURCE/env.api"
SHARED="$ROOT_DIR/tenants/_shared/secrets.env"
EXAMPLE="$ROOT_DIR/tenants/_shared/secrets.env.example"

if [[ ! -f "$SRC" ]]; then
  echo "Erro: $SRC não existe."
  echo "Use uma casa já configurada ou copie secrets.env.example manualmente."
  exit 1
fi

mkdir -p "$ROOT_DIR/tenants/_shared"
cp "$EXAMPLE" "$SHARED"

copy_key() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$SRC" | head -1 || true)"
  if [[ -n "$line" ]]; then
    if grep -qE "^${key}=" "$SHARED"; then
      sed -i "s|^${key}=.*|${line}|" "$SHARED"
    else
      echo "$line" >> "$SHARED"
    fi
  fi
}

SHARED_KEYS=(
  PLAYFIVER_AGENT_TOKEN
  PLAYFIVER_SECRET_KEY
  CPFHUB_API_KEY
  MISTICPAY_CI
  MISTICPAY_CS
  MISTICPAY_API_URL
  MISTICPAY_WEBHOOK_SECRET
  PAYMENT_GATEWAY
  BSPAY_CLIENT_ID
  BSPAY_CLIENT_SECRET
  BSPAY_SIGNING_KEY
  BSPAY_WEBHOOK_SECRET
  BSPAY_API_URL
  VEOPAG_CLIENT_ID
  VEOPAG_CLIENT_SECRET
  VEOPAG_WEBHOOK_SECRET
  VEOPAG_API_URL
  AVIATOR_GAME_ENABLED
  AVIATOR_PYTHON_PORT
  AVIATOR_PYTHON_AUTOSTART
  AVIATOR_API_ENABLED
  GAME_LAUNCH_MOCK
)

for key in "${SHARED_KEYS[@]}"; do
  copy_key "$key"
done

chmod 600 "$SHARED" 2>/dev/null || true

echo "OK: secrets compartilhados em tenants/_shared/secrets.env"
echo
echo "Confira (sem expor valores):"
grep -E '^[A-Z_]+=' "$SHARED" | cut -d= -f1 | sort -u
echo
echo "Próxima casa nova:"
echo "  1. Crie tenants/SLUG/supabase.env (3 keys Supabase)"
echo "  2. ./scripts/nova-casa.sh SLUG --deploy"
