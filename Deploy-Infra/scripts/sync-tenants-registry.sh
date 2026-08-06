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

function apiBlock(slug) {
  return (
    `  api-${slug}:\n` +
    `    <<: *api-base\n` +
    `    container_name: api-${slug}\n` +
    `    env_file:\n` +
    `      - ./tenants/${slug}/env.api\n` +
    `    profiles:\n` +
    `      - ${slug}\n` +
    `      - all\n`
  );
}

let compose = fs.readFileSync(composePath, 'utf8');
const lines = compose.split('\n');
const kept = [];
let skippingApi = false;

for (const line of lines) {
  if (/^  api-[a-z0-9-]+:/.test(line)) {
    skippingApi = true;
    continue;
  }
  if (skippingApi) {
    if (line.startsWith('networks:')) {
      skippingApi = false;
      kept.push('');
      for (const item of registry) {
        kept.push(apiBlock(item.slug).trimEnd());
        kept.push('');
      }
      kept.push(line);
    }
    continue;
  }
  kept.push(line);
}

if (!kept.some((l) => l.startsWith('networks:'))) {
  console.error('docker-compose.yml sem seção networks:');
  process.exit(1);
}

fs.writeFileSync(composePath, `${kept.join('\n').replace(/\n+$/, '\n')}`);
console.log(`OK: ${registry.length} tenant(s) — compose + ops-panel sincronizados`);
for (const item of registry) {
  console.log(`  - ${item.slug} (${item.domain})`);
}
NODE
