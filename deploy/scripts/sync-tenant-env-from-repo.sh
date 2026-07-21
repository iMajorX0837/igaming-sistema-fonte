#!/usr/bin/env bash
# Copia PlayFiverAPI/.env (do git pull) para deploy/tenants/<tenant>/env.api
# com URLs e CORS do domínio de produção.
#
# Uso (na VPS):
#   cd /opt/venuzbet/deploy
#   ./scripts/sync-tenant-env-from-repo.sh stewgaming stewgaming.com
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"

usage() {
  echo "Uso: $0 <tenant> <dominio>"
  echo "Exemplo: $0 stewgaming stewgaming.com"
  exit 1
}

TENANT="${1:-}"
DOMAIN="${2:-}"
[[ -n "$TENANT" && -n "$DOMAIN" ]] || usage

TENANT_DIR="$ROOT_DIR/tenants/$TENANT"
API_LOCAL="$REPO_ROOT/PlayFiverAPI/.env"
OUT="$TENANT_DIR/env.api"

if [[ ! -d "$TENANT_DIR" ]]; then
  echo "Erro: tenant não existe: $TENANT_DIR"
  echo "Rode: ./scripts/add-tenant.sh $TENANT $DOMAIN"
  exit 1
fi

if [[ ! -f "$API_LOCAL" ]]; then
  echo "Erro: $API_LOCAL não encontrado (git pull traz PlayFiverAPI/.env)."
  exit 1
fi

mkdir -p "$TENANT_DIR"

# Base: .env do repositório
cp "$API_LOCAL" "$OUT"

# Produção + domínio do tenant
sed -i "s|^PUBLIC_API_URL=.*|PUBLIC_API_URL=https://api.$DOMAIN|" "$OUT"

if grep -q '^NODE_ENV=' "$OUT"; then
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' "$OUT"
else
  sed -i "1i NODE_ENV=production" "$OUT"
fi

CORS_LINE="CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,https://admin.$DOMAIN"
if grep -q '^CORS_ORIGINS=' "$OUT"; then
  sed -i "s|^CORS_ORIGINS=.*|$CORS_LINE|" "$OUT"
else
  printf '\n%s\n' "$CORS_LINE" >> "$OUT"
fi

# Aviator padrão de produção (se ausente)
grep -q '^AVIATOR_GAME_ENABLED=' "$OUT" || echo 'AVIATOR_GAME_ENABLED=true' >> "$OUT"
grep -q '^AVIATOR_PYTHON_PORT=' "$OUT" || echo 'AVIATOR_PYTHON_PORT=8001' >> "$OUT"
grep -q '^AVIATOR_PYTHON_AUTOSTART=' "$OUT" || echo 'AVIATOR_PYTHON_AUTOSTART=true' >> "$OUT"
grep -q '^AVIATOR_API_ENABLED=' "$OUT" || echo 'AVIATOR_API_ENABLED=false' >> "$OUT"

# Front/admin (paths relativos via nginx)
cat > "$TENANT_DIR/env.front" <<EOF
VITE_API_BASE=/api/supabase
VITE_DEPOSIT_API_BASE=/api/deposit
VITE_PLAYFIVERS_API_BASE=/api/v2
VITE_GAME_LAUNCH_URL=/api/game_launch
EOF

cat > "$TENANT_DIR/env.admin" <<EOF
VITE_API_BASE=/api/supabase
VITE_PLAYFIVERS_API_BASE=/api/v2
VITE_PLAYFIVERS_QUEUE_CONCURRENCY=1
VITE_PLAYFIVERS_QUEUE_INTERVAL_MS=400
EOF

echo "OK: $OUT atualizado para https://api.$DOMAIN"
echo
echo "Confira (sem expor secrets):"
grep -E '^(NODE_ENV|PUBLIC_API_URL|CORS_ORIGINS|SUPABASE_URL|AVIATOR_GAME_ENABLED)=' "$OUT" || true
echo
echo "Próximo passo:"
echo "  docker compose --profile $TENANT up -d --force-recreate api-$TENANT"
echo "  docker compose logs --tail=50 api-$TENANT"
