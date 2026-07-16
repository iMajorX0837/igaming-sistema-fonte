#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  echo "Uso: $0 <slug> <dominio>"
  echo "Exemplo: $0 zorbybet zorbybet.com"
  exit 1
}

SLUG="${1:-}"
DOMAIN="${2:-}"
[[ -n "$SLUG" && -n "$DOMAIN" ]] || usage

TENANT_DIR="$ROOT_DIR/tenants/$SLUG"
TEMPLATE_DIR="$ROOT_DIR/tenants/_template"

mkdir -p "$TENANT_DIR/front" "$TENANT_DIR/admin"

if [[ ! -f "$TENANT_DIR/env.api" ]]; then
  sed \
    -e "s/SEUDOMINIO.com/$DOMAIN/g" \
    "$TEMPLATE_DIR/env.api.example" > "$TENANT_DIR/env.api"
fi

if [[ ! -f "$TENANT_DIR/env.front" ]]; then
  sed \
    -e "s/SEUDOMINIO.com/$DOMAIN/g" \
    "$TEMPLATE_DIR/env.front.example" > "$TENANT_DIR/env.front"
fi

if [[ ! -f "$TENANT_DIR/env.admin" ]]; then
  sed \
    -e "s/SEUDOMINIO.com/$DOMAIN/g" \
    "$TEMPLATE_DIR/env.admin.example" > "$TENANT_DIR/env.admin"
fi

if [[ ! -f "$ROOT_DIR/nginx/conf.d/$SLUG.conf" ]]; then
  sed \
    -e "s/zorbybet/$SLUG/g" \
    -e "s/zorbybet.com/$DOMAIN/g" \
    "$ROOT_DIR/nginx/conf.d/zorbybet.conf.example" > "$ROOT_DIR/nginx/conf.d/$SLUG.conf"
fi

COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
if [[ -f "$COMPOSE_FILE" ]] && ! grep -q "api-$SLUG:" "$COMPOSE_FILE"; then
  TMP="$(mktemp)"
  awk -v slug="$SLUG" '
    /^networks:/ {
      print "  api-" slug ":"
      print "    <<: *api-base"
      print "    container_name: api-" slug
      print "    env_file:"
      print "      - ./tenants/" slug "/env.api"
      print "    profiles:"
      print "      - " slug
      print "      - all"
      print ""
    }
    { print }
  ' "$COMPOSE_FILE" > "$TMP"
  mv "$TMP" "$COMPOSE_FILE"
  echo "Serviço api-$SLUG adicionado ao docker-compose.yml"
fi

cat <<EOF

Tenant criado: $SLUG

Próximos passos:
1. Edite deploy/tenants/$SLUG/env.api (Supabase, MisticPay, etc.)
2. Aponte DNS:
   - $DOMAIN
   - admin.$DOMAIN
   - api.$DOMAIN
3. bash deploy/scripts/build-tenant.sh $SLUG
4. bash deploy/scripts/up-tenant.sh $SLUG

EOF
