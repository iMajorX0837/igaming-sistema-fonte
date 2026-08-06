#!/usr/bin/env bash
# Sincroniza docker-compose.yml e ops-panel/tenants.json a partir de tenants.registry.json
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT_DIR/scripts/lib.sh"

REGISTRY="$ROOT_DIR/tenants.registry.json"

if [[ ! -f "$REGISTRY" ]]; then
  echo "Erro: $REGISTRY não encontrado."
  exit 1
fi

export REGISTRY_ROOT="$ROOT_DIR"

run_node << 'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.REGISTRY_ROOT;
const registryPath = path.join(root, 'tenants.registry.json');
const composePath = path.join(root, 'docker-compose.yml');
const opsPath = path.join(root, '..', 'ops-panel', 'tenants.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
if (!Array.isArray(registry) || registry.length === 0) {
  console.error('tenants.registry.json vazio ou inválido');
  process.exit(1);
}

fs.writeFileSync(opsPath, `${JSON.stringify(registry, null, 2)}\n`);

let compose = fs.readFileSync(composePath, 'utf8');
for (const item of registry) {
  const slug = item.slug;
  const marker = `  api-${slug}:`;
  if (compose.includes(marker)) continue;

  const block =
    `  api-${slug}:\n` +
    `    <<: *api-base\n` +
    `    container_name: api-${slug}\n` +
    `    env_file:\n` +
    `      - ./tenants/${slug}/env.api\n` +
    `    profiles:\n` +
    `      - ${slug}\n` +
    `      - all\n\n`;

  if (!compose.includes('networks:')) {
    console.error('docker-compose.yml sem seção networks:');
    process.exit(1);
  }
  compose = compose.replace('networks:', `${block}networks:`, 1);
}

fs.writeFileSync(composePath, compose);
console.log(`OK: ${registry.length} tenant(s) — compose + ops-panel sincronizados`);
for (const item of registry) {
  console.log(`  - ${item.slug} (${item.domain})`);
}
NODE
