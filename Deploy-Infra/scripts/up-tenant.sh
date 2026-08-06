#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Uso: $0 <tenant>"
  echo "Exemplo: $0 zorbybet"
  exit 1
}

TENANT="${1:-}"
[[ -n "$TENANT" ]] || usage

ENV_API="$ROOT_DIR/tenants/$TENANT/env.api"
NGINX_CONF="$ROOT_DIR/nginx/conf.d/$TENANT.conf"

if [[ ! -f "$ENV_API" ]]; then
  echo "Erro: crie $ENV_API (copie de tenants/_template/env.api.example)."
  exit 1
fi

if [[ ! -f "$NGINX_CONF" ]]; then
  if [[ -f "$ROOT_DIR/nginx/conf.d/$TENANT.conf.example" ]]; then
    cp "$ROOT_DIR/nginx/conf.d/$TENANT.conf.example" "$NGINX_CONF"
    echo "Criado $NGINX_CONF — revise os domínios antes de produção."
  else
    echo "Erro: crie nginx/conf.d/$TENANT.conf (use o .example como base)."
    exit 1
  fi
fi

if [[ ! -d "$ROOT_DIR/tenants/$TENANT/front" || ! -f "$ROOT_DIR/tenants/$TENANT/front/index.html" ]]; then
  echo "Front ainda não buildado. Rodando build-tenant.sh..."
  bash "$ROOT_DIR/scripts/build-tenant.sh" "$TENANT"
fi

echo "==> Build imagem da API (compartilhada entre tenants)"
docker compose build

echo "==> Subindo tenant: $TENANT"
docker compose --profile "$TENANT" up -d nginx "api-$TENANT"

echo
echo "Tenant $TENANT no ar."
echo "Logs API: docker compose logs -f api-$TENANT"
echo "Reload nginx: docker compose exec nginx nginx -s reload"
