#!/usr/bin/env bash
# Sobe uma casa por completo: compose, front/admin, container da API e nginx.
# Uso: ./scripts/up-tenant.sh <tenant>
#      RESTART=1 ./scripts/up-tenant.sh <tenant>
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
[[ "$TENANT" =~ ^[a-z0-9-]+$ ]] || { echo "Erro: slug inválido"; exit 1; }

SERVICE="api-$TENANT"
ENV_API="$ROOT_DIR/tenants/$TENANT/env.api"
TENANT_DIR="$ROOT_DIR/tenants/$TENANT"

if [[ ! -f "$ENV_API" ]]; then
  echo "Erro: $ENV_API não existe. Crie a casa pelo painel ou nova-casa.sh."
  exit 1
fi

echo "==> [1/5] Garantir compose + nginx ($TENANT)"
bash "$ROOT_DIR/scripts/ensure-tenant-compose.sh" "$TENANT"

if [[ ! -f "$TENANT_DIR/front/index.html" || ! -f "$TENANT_DIR/admin/index.html" ]]; then
  echo "==> [2/5] Front/admin ausentes — buildando"
  bash "$ROOT_DIR/scripts/build-tenant.sh" "$TENANT"
else
  echo "==> [2/5] Front/admin já existem"
fi

if ! docker image inspect venuz-api:latest >/dev/null 2>&1; then
  echo "==> [3/5] Imagem da API ausente — buildando"
  docker compose build "$SERVICE"
else
  echo "==> [3/5] Imagem venuz-api:latest ok"
fi

echo "==> [4/5] Subir container $SERVICE"
if [[ "${RESTART:-}" == "1" ]] && docker inspect "$SERVICE" >/dev/null 2>&1; then
  docker restart "$SERVICE"
else
  docker compose --profile "$TENANT" up -d "$SERVICE"
fi

echo "==> Aguardando API ficar no ar"
ready=0
for i in $(seq 1 40); do
  if docker inspect -f '{{.State.Running}}' "$SERVICE" 2>/dev/null | grep -q true; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "Erro: $SERVICE não subiu."
  docker logs "$SERVICE" --tail=40 || true
  exit 1
fi

if [[ -f "$ROOT_DIR/nginx/conf.d/$TENANT.conf.stopped" ]]; then
  mv "$ROOT_DIR/nginx/conf.d/$TENANT.conf.stopped" "$ROOT_DIR/nginx/conf.d/$TENANT.conf"
fi

docker compose up -d nginx

echo "==> [5/5] Reload nginx"
docker exec venuz-nginx nginx -t
docker exec venuz-nginx nginx -s reload

echo "==> Healthcheck"
health_ok=0
for i in $(seq 1 20); do
  if docker exec venuz-nginx wget -qO- "http://${SERVICE}:3000/health" >/dev/null 2>&1; then
    health_ok=1
    break
  fi
  sleep 1
done

if [[ "$health_ok" -eq 1 ]]; then
  echo "OK: $TENANT no ar (API + nginx + front/admin)."
else
  echo "AVISO: container no ar, mas /health ainda não respondeu. Logs:"
  docker logs "$SERVICE" --tail=30 || true
  exit 1
fi
