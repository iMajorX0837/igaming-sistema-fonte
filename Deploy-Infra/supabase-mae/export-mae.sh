#!/usr/bin/env bash
# Exporta schema + dados de config da Supabase mãe (stewgaming).
# Uso: PGPASSWORD='...' ./export-mae.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$ROOT/supabase-mae"

PGHOST="${PGHOST:-aws-1-sa-east-1.pooler.supabase.com}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres.psoyhrnjnalroihnswoo}"
PGDATABASE="${PGDATABASE:-postgres}"

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "Defina PGPASSWORD antes de rodar."
  exit 1
fi

mkdir -p "$OUT"

echo "==> Schema public (tabelas, colunas, RLS, funções, triggers, GRANTs)..."
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  --schema=public --schema-only --no-owner \
  --file="$OUT/schema.sql"

echo "==> Privilégios (grants.sql — fix rápido em casa existente)..."
{
  echo "-- Privilégios extraídos da Supabase mãe (public)"
  echo "-- Rode no SQL Editor se aparecer permission denied (42501) para anon"
  echo "-- Gerado por export-mae.sh em $(date -Iseconds)"
  echo
  grep -E '^(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES)' "$OUT/schema.sql" || true
} > "$OUT/grants.sql"

TABLES=$(python3 -c "import json; print(' '.join(json.load(open('$OUT/config_tables.json'))))")

echo "==> Dados de config (18 tabelas, sem players)..."
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
  --data-only --no-owner --no-privileges --disable-triggers \
  $(for t in $TABLES; do echo -n "-t public.$t "; done) \
  --file="$OUT/config_data.sql"

echo "OK: $OUT/schema.sql + grants.sql + config_data.sql + auth_trigger.sql"
echo "Próximo: importar em projeto novo com ./import-nova-casa.sh"
