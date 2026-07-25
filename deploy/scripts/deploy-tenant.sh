#!/usr/bin/env bash
# Deploy completo após git push no PC:
#   cd /opt/venuzbet/deploy && ./scripts/deploy-tenant.sh
#   cd /opt/venuzbet/deploy && ./scripts/deploy-tenant.sh stewgaming
#   NO_CACHE=1 ./scripts/deploy-tenant.sh stewgaming
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
TENANT="${1:-stewgaming}"
SERVICE="api-$TENANT"
ENV_API="$ROOT_DIR/tenants/$TENANT/env.api"

usage() {
  echo "Uso: $0 [tenant]"
  echo "  tenant padrão: stewgaming"
  echo "  NO_CACHE=1 $0        — rebuild Docker sem cache"
  exit 1
}

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage

if [[ ! -f "$ENV_API" ]]; then
  echo "Erro: $ENV_API não existe."
  echo "Rode: ./scripts/add-tenant.sh $TENANT SEUDOMINIO.com"
  exit 1
fi

BUILD_EXTRA=()
if [[ "${NO_CACHE:-}" == "1" ]]; then
  BUILD_EXTRA+=(--no-cache)
fi

echo "==> [1/5] git pull ($REPO_ROOT)"
cd "$REPO_ROOT"
git pull

echo "==> [2/5] Build imagem API ${BUILD_EXTRA[*]:-"(cache)"}"
cd "$ROOT_DIR"
docker compose build "${BUILD_EXTRA[@]}"

echo "==> [3/5] Build front + admin ($TENANT)"
bash "$ROOT_DIR/scripts/build-tenant.sh" "$TENANT"

echo "==> [4/5] Subir API + nginx (--force-recreate)"
docker compose --profile "$TENANT" up -d --force-recreate "$SERVICE" nginx

echo "==> [5/5] Healthcheck (aguarda 20s)"
sleep 20

if docker compose exec -T nginx wget -qO- "http://${SERVICE}:3000/health" 2>/dev/null; then
  echo
  echo "OK: API respondeu /health na rede interna."
else
  echo
  echo "AVISO: /health interno falhou. Logs:"
  docker compose logs --tail=30 "$SERVICE"
  exit 1
fi

echo
docker compose ps
echo
echo "Deploy concluído: tenant=$TENANT"
echo "Site: confira no browser. Logs: docker compose logs -f $SERVICE"
