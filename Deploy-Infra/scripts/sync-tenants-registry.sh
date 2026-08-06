#!/usr/bin/env bash
# Sincroniza docker-compose.yml e ops-panel/tenants.json a partir de tenants.registry.json
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
REGISTRY="$ROOT_DIR/tenants.registry.json"

if [[ ! -f "$REGISTRY" ]]; then
  echo "Erro: $REGISTRY não encontrado."
  exit 1
fi

export REGISTRY_ROOT="$ROOT_DIR"

python3 << 'PY'
import json
import os
from pathlib import Path

root = Path(os.environ["REGISTRY_ROOT"])
registry_path = root / "tenants.registry.json"
compose_path = root / "docker-compose.yml"
ops_path = root.parent / "ops-panel" / "tenants.json"

registry = json.loads(registry_path.read_text(encoding="utf-8"))
if not isinstance(registry, list) or not registry:
    raise SystemExit("tenants.registry.json vazio ou inválido")

ops_path.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")

compose = compose_path.read_text(encoding="utf-8")
for item in registry:
    slug = item["slug"]
    marker = f"  api-{slug}:"
    if marker in compose:
        continue
    block = (
        f"  api-{slug}:\n"
        f"    <<: *api-base\n"
        f"    container_name: api-{slug}\n"
        f"    env_file:\n"
        f"      - ./tenants/{slug}/env.api\n"
        f"    profiles:\n"
        f"      - {slug}\n"
        f"      - all\n\n"
    )
    if "networks:" not in compose:
        raise SystemExit("docker-compose.yml sem seção networks:")
    compose = compose.replace("networks:", block + "networks:", 1)

compose_path.write_text(compose, encoding="utf-8")
print(f"OK: {len(registry)} tenant(s) — compose + ops-panel sincronizados")
for item in registry:
    print(f"  - {item['slug']} ({item['domain']})")
PY
