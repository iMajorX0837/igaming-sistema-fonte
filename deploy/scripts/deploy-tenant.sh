#!/usr/bin/env bash
# Deploy completo após git push no PC:
#   cd /opt/venuzbet/deploy && ./scripts/deploy-tenant.sh
#   cd /opt/venuzbet/deploy && ./scripts/deploy-tenant.sh stewgaming
#   NO_CACHE=1 ./scripts/deploy-tenant.sh stewgaming
#   CLEAN=1 ./scripts/deploy-tenant.sh           — para tudo, apaga assets, rebuild sem cache
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
  echo "  CLEAN=1 $0           — stop + limpa front/admin + build --no-cache + recreate"
  exit 1
}

[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && usage

if [[ ! -f "$ENV_API" ]]; then
  echo "Erro: $ENV_API não existe."
  echo "Rode: ./scripts/add-tenant.sh $TENANT SEUDOMINIO.com"
  exit 1
fi

BUILD_EXTRA=()
if [[ "${NO_CACHE:-}" == "1" || "${CLEAN:-}" == "1" ]]; then
  BUILD_EXTRA+=(--no-cache)
fi

TENANT_DIR="$ROOT_DIR/tenants/$TENANT"

echo "==> [1/6] git pull ($REPO_ROOT)"
cd "$REPO_ROOT"
git pull

cd "$ROOT_DIR"

if [[ "${CLEAN:-}" == "1" ]]; then
  echo "==> [2/6] Parar API + nginx e limpar assets ($TENANT)"
  docker compose --profile "$TENANT" stop "$SERVICE" nginx 2>/dev/null || true
  rm -rf "$TENANT_DIR/front" "$TENANT_DIR/admin"
  mkdir -p "$TENANT_DIR/front" "$TENANT_DIR/admin"
  docker builder prune -f >/dev/null 2>&1 || true
  STEP_BUILD=3
  STEP_TENANT=4
  STEP_UP=5
  STEP_HEALTH=6
else
  STEP_BUILD=2
  STEP_TENANT=3
  STEP_UP=4
  STEP_HEALTH=5
fi

echo "==> [$STEP_BUILD/6] Build imagem API ${BUILD_EXTRA[*]:-"(cache)"}"
docker compose build "${BUILD_EXTRA[@]}"

echo "==> [$STEP_TENANT/6] Build front + admin ($TENANT)"
bash "$ROOT_DIR/scripts/build-tenant.sh" "$TENANT"

echo "==> [$STEP_UP/6] Subir API + nginx (--force-recreate)"
docker compose --profile "$TENANT" up -d --force-recreate "$SERVICE" nginx

echo "==> [$STEP_HEALTH/6] Healthcheck (aguarda 20s)"
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
