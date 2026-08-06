#!/usr/bin/env bash
# Remove uma casa por completo: container, nginx, pasta, registry e compose.
# Uso: ./scripts/delete-tenant.sh <slug>
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"

SLUG="${1:-}"

usage() {
  echo "Uso: $0 <slug>"
  exit 1
}

[[ -n "$SLUG" ]] || usage

if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "Erro: slug inválido."
  exit 1
fi

if [[ "$SLUG" == "_shared" || "$SLUG" == "_template" ]]; then
  echo "Erro: slug protegido."
  exit 1
fi

SERVICE="api-$SLUG"
TENANT_DIR="$ROOT_DIR/tenants/$SLUG"
REGISTRY="$ROOT_DIR/tenants.registry.json"
COMPOSE="$ROOT_DIR/docker-compose.yml"

echo "==> Excluindo casa: $SLUG"

echo "==> [1/5] Parar e remover container $SERVICE"
docker compose --profile "$SLUG" stop "$SERVICE" 2>/dev/null || true
docker stop "$SERVICE" 2>/dev/null || true
docker rm -f "$SERVICE" 2>/dev/null || true

echo "==> [2/5] Remover nginx"
rm -f "$ROOT_DIR/nginx/conf.d/$SLUG.conf" "$ROOT_DIR/nginx/conf.d/$SLUG.conf.stopped"

echo "==> [3/5] Remover pasta tenants/$SLUG"
rm -rf "$TENANT_DIR"

echo "==> [4/5] Remover do registry e docker-compose.yml"
export REGISTRY_PATH="$REGISTRY" COMPOSE_PATH="$COMPOSE" DELETE_SLUG="$SLUG"

python3 << 'PY'
import json
import os
from pathlib import Path

slug = os.environ["DELETE_SLUG"]
registry_path = Path(os.environ["REGISTRY_PATH"])
compose_path = Path(os.environ["COMPOSE_PATH"])

registry = json.loads(registry_path.read_text(encoding="utf-8"))
new_registry = [t for t in registry if t.get("slug") != slug]
if len(new_registry) == len(registry):
    print(f"Aviso: slug '{slug}' não estava em tenants.registry.json")
registry_path.write_text(json.dumps(new_registry, indent=2) + "\n", encoding="utf-8")
print(f"Registry: {len(new_registry)} casa(s) restante(s)")

compose = compose_path.read_text(encoding="utf-8")
lines = compose.splitlines(keepends=True)
out = []
skip = False
marker = f"  api-{slug}:"
for line in lines:
    if line.startswith(marker):
        skip = True
        continue
    if skip:
        if line.startswith("  api-") or line.startswith("networks:"):
            skip = False
            out.append(line)
        continue
    out.append(line)
compose_path.write_text("".join(out), encoding="utf-8")
print(f"Compose: serviço api-{slug} removido")
PY

echo "==> [5/5] Sincronizar painel + reload nginx"
bash "$ROOT_DIR/scripts/sync-tenants-registry.sh"

if docker ps --format '{{.Names}}' | grep -qx venuz-nginx; then
  docker exec venuz-nginx nginx -t
  docker exec venuz-nginx nginx -s reload
fi

echo "OK: casa '$SLUG' removida (Supabase do projeto não é apagado)."
