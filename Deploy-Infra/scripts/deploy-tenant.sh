#!/usr/bin/env bash
# Deploy completo após git push no PC:
#   cd /opt/venuzbet/Deploy-Infra && ./scripts/deploy-tenant.sh
#   cd /opt/venuzbet/Deploy-Infra && ./scripts/deploy-tenant.sh stewgaming
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

if [[ "${SKIP_GIT:-}" != "1" ]]; then
  echo "==> [1/6] Atualizar código ($REPO_ROOT)"
  cd "$REPO_ROOT"
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  REGISTRY_BACKUP="$(mktemp)"
  cp "$ROOT_DIR/tenants.registry.json" "$REGISTRY_BACKUP" 2>/dev/null || true
  git fetch origin
  git reset --hard "origin/$BRANCH"
  if [[ -f "$REGISTRY_BACKUP" ]]; then
    REGISTRY_PATH="$ROOT_DIR/tenants.registry.json" REGISTRY_BACKUP="$REGISTRY_BACKUP" node -e '
      const fs = require("fs");
      const a = JSON.parse(fs.readFileSync(process.env.REGISTRY_PATH, "utf8"));
      const b = JSON.parse(fs.readFileSync(process.env.REGISTRY_BACKUP, "utf8"));
      const map = new Map(a.map((t) => [t.slug, t]));
      for (const t of b) if (!map.has(t.slug)) map.set(t.slug, t);
      const merged = [...map.values()].sort((x, y) => x.slug.localeCompare(y.slug));
      fs.writeFileSync(process.env.REGISTRY_PATH, JSON.stringify(merged, null, 2) + "\n");
    ' || true
    rm -f "$REGISTRY_BACKUP"
  fi
else
  echo "==> [1/6] Pulando git reset (SKIP_GIT=1)"
fi

cd "$ROOT_DIR"
chmod +x "$ROOT_DIR"/scripts/*.sh 2>/dev/null || true

bash "$ROOT_DIR/scripts/sync-tenants-registry.sh" 2>/dev/null || true

echo "==> Garantir serviço docker-compose + nginx ($TENANT)"
bash "$ROOT_DIR/scripts/ensure-tenant-compose.sh" "$TENANT"

if [[ "${CLEAN:-}" == "1" ]]; then
  echo "==> [2/6] Parar API da casa e limpar assets ($TENANT)"
  docker compose --profile "$TENANT" stop "$SERVICE" 2>/dev/null || true
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

echo "==> [$STEP_BUILD/6] Build imagem API ($SERVICE) ${BUILD_EXTRA[*]:-"(cache)"}"
docker compose build "${BUILD_EXTRA[@]}" "$SERVICE"

echo "==> [$STEP_TENANT/6] Build front + admin ($TENANT)"
bash "$ROOT_DIR/scripts/build-tenant.sh" "$TENANT"

echo "==> [$STEP_UP/6] Subir API e recarregar nginx"
docker compose --profile "$TENANT" up -d --force-recreate "$SERVICE"
if [[ -f "$ROOT_DIR/nginx/conf.d/$TENANT.conf.stopped" ]]; then
  mv "$ROOT_DIR/nginx/conf.d/$TENANT.conf.stopped" "$ROOT_DIR/nginx/conf.d/$TENANT.conf"
fi
docker compose up -d nginx
docker exec venuz-nginx nginx -t
docker exec venuz-nginx nginx -s reload

echo "==> [$STEP_HEALTH/6] Healthcheck (aguarda 20s)"
sleep 20

if docker exec venuz-nginx wget -qO- "http://${SERVICE}:3000/health" 2>/dev/null; then
  echo
  echo "OK: API respondeu /health na rede interna."
else
  echo
  echo "AVISO: /health interno falhou. Logs:"
  docker compose logs --tail=30 "$SERVICE"
  exit 1
fi

echo "==> Aviator: regenerar fila de velas (invalidate RTP queue)"
if docker compose exec -T "$SERVICE" node -e \
  "fetch('http://127.0.0.1:8001/api/rtp/invalidate',{method:'POST',headers:{'X-Aviator-Internal':process.env.AVIATOR_INTERNAL_SECRET,'Content-Type':'application/json'},body:'{}'}).then(r=>r.json()).then(j=>{if(!j.ok)process.exit(1);}).catch(()=>process.exit(1))" \
  2>/dev/null; then
  echo "OK: fila Aviator regenerada."
else
  echo "AVISO: invalidate da fila Aviator falhou (jogo pode usar velas antigas até Salvar no admin)."
fi

echo
docker compose ps
echo
echo "Deploy concluído: tenant=$TENANT"
echo "Site: confira no browser. Logs: docker compose logs -f $SERVICE"
