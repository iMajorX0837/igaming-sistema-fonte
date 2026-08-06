#!/usr/bin/env bash
# Resolve domain/label de um slug no tenants.registry.json (stdout: domain\\tlabel\\tupdated)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT_DIR/scripts/lib.sh"

run_node << 'NODE'
const fs = require('fs');

const registryPath = process.env.REGISTRY_PATH;
const slug = process.env.NOVA_SLUG;
let domain = (process.env.NOVA_DOMAIN || '').trim();
let label = (process.env.NOVA_LABEL || '').trim();
const register = process.env.NOVA_REGISTER === '1';

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const found = registry.find((t) => t.slug === slug);
let updated = '0';

if (found) {
  domain = domain || found.domain || '';
  label = label || found.label || slug;
} else if (register && domain) {
  label = label || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  registry.push({ slug, label, domain });
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  updated = '1';
} else {
  console.error(`Slug '${slug}' não está em tenants.registry.json.`);
  console.error("Adicione no git ou use: --domain bandpiix.com --label 'Band Piix' --register");
  process.exit(1);
}

if (!domain) {
  console.error('Domínio não definido.');
  process.exit(1);
}

label = label || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
process.stdout.write(`${domain}\t${label}\t${updated}`);
NODE
