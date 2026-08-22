#!/usr/bin/env bash
# Nova casa rápida — só precisa das 3 keys Supabase em tenants/<slug>/supabase.env
#
# Setup único na VPS (1x):
#   ./scripts/init-platform-secrets.sh stewgaming
#
# Nova casa:
#   1. Adicione o slug em tenants.registry.json (git push)
#   2. Supabase: rode supabase_nova_casa.sql no projeto novo
#   3. nano tenants/bandpiix/supabase.env   (3 keys)
#   4. ./scripts/nova-casa.sh bandpiix --deploy
#
# Uso:
#   ./scripts/nova-casa.sh <slug> [--deploy] [--domain X] [--label Y]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"

SLUG=""
DOMAIN=""
LABEL=""
DEPLOY=1
REGISTER=0

usage() {
  cat <<EOF
Uso: $0 <slug> [opções]

Opções:
  --deploy          Sobe a casa completa (padrão)
  --no-deploy       Só scaffold (env/nginx/compose), sem container/front
  --domain DOM      Domínio (se não estiver no tenants.registry.json)
  --label NOME      Nome exibido no painel
  --register        Adiciona ao tenants.registry.json (requer --domain)

Exemplo:
  nano tenants/bandpiix/supabase.env
  $0 bandpiix --deploy
EOF
  exit 1
}

[[ $# -ge 1 ]] || usage
SLUG="$1"
shift

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy) DEPLOY=1 ;;
    --no-deploy) DEPLOY=0 ;;
    --domain) DOMAIN="${2:-}"; shift ;;
    --label) LABEL="${2:-}"; shift ;;
    --register) REGISTER=1 ;;
    -h|--help) usage ;;
    *) echo "Opção desconhecida: $1"; usage ;;
  esac
  shift
done

if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "Erro: slug inválido (use a-z, 0-9, hífen)."
  exit 1
fi

REGISTRY="$ROOT_DIR/tenants.registry.json"
SHARED="$ROOT_DIR/tenants/_shared/secrets.env"
TENANT_DIR="$ROOT_DIR/tenants/$SLUG"
SUPABASE_ENV="$TENANT_DIR/supabase.env"
ENV_API="$TENANT_DIR/env.api"

if [[ ! -f "$SHARED" ]]; then
  echo "Erro: $SHARED não existe."
  echo "Rode uma vez: ./scripts/init-platform-secrets.sh stewgaming"
  exit 1
fi

# Resolver domain/label via registry ou flags
export NOVA_SLUG="$SLUG" NOVA_DOMAIN="$DOMAIN" NOVA_LABEL="$LABEL" NOVA_REGISTER="$REGISTER"
export REGISTRY_PATH="$REGISTRY"

IFS=$'\t' read -r RES_DOMAIN RES_LABEL REGISTRY_UPDATED <<< "$(export NOVA_SLUG="$SLUG" NOVA_DOMAIN="$DOMAIN" NOVA_LABEL="$LABEL" NOVA_REGISTER="$REGISTER" REGISTRY_PATH="$REGISTRY"; bash "$ROOT_DIR/scripts/resolve-tenant-registry.sh")"

DOMAIN="$RES_DOMAIN"
LABEL="$RES_LABEL"

if [[ "$REGISTRY_UPDATED" == "1" ]]; then
  echo "==> Registrado em tenants.registry.json — faça git commit + push depois."
fi

echo "==> Casa: $SLUG ($LABEL) — $DOMAIN"

bash "$ROOT_DIR/scripts/sync-tenants-registry.sh"

if [[ ! -f "$SUPABASE_ENV" ]]; then
  cp "$ROOT_DIR/tenants/_template/supabase.env.example" "$SUPABASE_ENV"
  echo
  echo "Criei $SUPABASE_ENV — preencha as 3 keys Supabase e rode de novo:"
  echo "  nano $SUPABASE_ENV"
  echo "  $0 $SLUG --deploy"
  exit 0
fi

# Validar supabase.env
missing=0
for key in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_KEY; do
  if ! grep -qE "^${key}=.+[^[:space:]]" "$SUPABASE_ENV"; then
    echo "Erro: $key ausente em $SUPABASE_ENV"
    missing=1
  fi
done
[[ "$missing" -eq 0 ]] || exit 1

echo "==> Scaffold tenant (nginx, pastas, compose)"
bash "$ROOT_DIR/scripts/add-tenant.sh" "$SLUG" "$DOMAIN" >/dev/null

mkdir -p "$TENANT_DIR/front" "$TENANT_DIR/admin"

CORS="https://${DOMAIN},https://www.${DOMAIN},https://admin.${DOMAIN},https://api.${DOMAIN},http://${DOMAIN},http://www.${DOMAIN},http://admin.${DOMAIN},http://api.${DOMAIN}"

{
  echo "# Gerado por nova-casa.sh — $(date -Iseconds)"
  echo "PORT=3000"
  echo "NODE_ENV=production"
  echo "PUBLIC_API_URL=https://api.${DOMAIN}"
  echo "PUBLIC_SITE_URL=https://${DOMAIN}"
  echo "CORS_ORIGINS=${CORS}"
  echo
  grep -E '^SUPABASE_' "$SUPABASE_ENV"
  echo
  grep -E '^[A-Z_]+=' "$SHARED" | grep -Ev '^(SUPABASE_|PUBLIC_|CORS_|PORT=|NODE_ENV=)' || true
  echo "AVIATOR_INTERNAL_SECRET=$(openssl rand -hex 32)"
  echo "AVIATOR_GAME_SESSION_SECRET=$(openssl rand -hex 32)"
  echo "INTERNAL_API_SECRET=$(openssl rand -hex 32)"
} > "$ENV_API"

cat > "$TENANT_DIR/env.front" << 'EOF'
VITE_API_BASE=/api/supabase
VITE_DEPOSIT_API_BASE=/api/deposit
VITE_PLAYFIVERS_API_BASE=/api/v2
VITE_GAME_LAUNCH_URL=/api/game_launch
EOF

cat > "$TENANT_DIR/env.admin" << 'EOF'
VITE_API_BASE=/api/supabase
VITE_PLAYFIVERS_API_BASE=/api/v2
VITE_PLAYFIVERS_QUEUE_CONCURRENCY=1
VITE_PLAYFIVERS_QUEUE_INTERVAL_MS=400
EOF

chmod 600 "$ENV_API" "$SUPABASE_ENV" 2>/dev/null || true

echo "==> env.api montado (shared secrets + Supabase + secrets únicos da casa)"
grep -E '^(PUBLIC_|SUPABASE_URL|AVIATOR_GAME_ENABLED)=' "$ENV_API" || true

cat <<EOF

Pronto: $SLUG

DNS (Cloudflare → IP da VPS):
  @ , admin , api  →  $DOMAIN

Supabase:
  - SQL Editor: Deploy-Infra/supabase_nova_casa.sql
  - Trigger auth.users + admin cargo

EOF

if [[ "$DEPLOY" -eq 1 ]]; then
  echo "==> Subindo casa completa (container + front/admin + nginx)..."
  bash "$ROOT_DIR/scripts/up-tenant.sh" "$SLUG"
else
  cat <<EOF
Scaffold pronto. Para subir de verdade:
  ./scripts/up-tenant.sh $SLUG

Ou:
  $0 $SLUG --deploy
EOF
fi
