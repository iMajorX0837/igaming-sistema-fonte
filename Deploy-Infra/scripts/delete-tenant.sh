#!/usr/bin/env bash
# Remove uma casa por completo: container, nginx, pasta, registry e compose.
# Uso: ./scripts/delete-tenant.sh <slug>
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT_DIR/scripts/lib.sh"

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

run_node << 'NODE'
const fs = require('fs');

const slug = process.env.DELETE_SLUG;
const registryPath = process.env.REGISTRY_PATH;
const composePath = process.env.COMPOSE_PATH;

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const newRegistry = registry.filter((t) => t.slug !== slug);
if (newRegistry.length === registry.length) {
  console.log(`Aviso: slug '${slug}' não estava em tenants.registry.json`);
}
fs.writeFileSync(registryPath, `${JSON.stringify(newRegistry, null, 2)}\n`);

console.log(`Registry: ${newRegistry.length} casa(s) restante(s)`);

const marker = `  api-${slug}:`;
const lines = fs.readFileSync(composePath, 'utf8').split(/(?<=\n)/);
const out = [];
let skip = false;

for (const line of lines) {
  if (line.startsWith(marker)) {
    skip = true;
    continue;
  }
  if (skip) {
    if (line.startsWith('  api-') || line.startsWith('networks:')) {
      skip = false;
      out.push(line);
    }
    continue;
  }
  out.push(line);
}

fs.writeFileSync(composePath, out.join(''));
console.log(`Compose: serviço api-${slug} removido`);
NODE

echo "==> [5/5] Sincronizar painel + reload nginx"
bash "$ROOT_DIR/scripts/sync-tenants-registry.sh"

if docker ps --format '{{.Names}}' | grep -qx venuz-nginx; then
  docker exec venuz-nginx nginx -t
  docker exec venuz-nginx nginx -s reload
fi

echo "OK: casa '$SLUG' removida (Supabase do projeto não é apagado)."
