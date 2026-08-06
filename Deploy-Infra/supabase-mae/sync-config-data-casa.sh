#!/usr/bin/env bash
# Recarrega só os dados de design/config da mãe (CMS, home, jogos, VIP...) sem apagar schema.
# Útil se a casa tem tabelas vazias ou layout desatualizado.
#
# Uso:
#   export PGPASSWORD='senha_do_projeto'
#   export PGHOST='aws-X-sa-east-1.pooler.supabase.com'
#   export PGUSER='postgres.REF_DO_PROJETO'
#   ./sync-config-data-casa.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TABLES=$(python3 -c "import json; print(' '.join(json.load(open('$ROOT/config_tables.json'))))")

if [[ -z "${PGPASSWORD:-}" || -z "${PGHOST:-}" || -z "${PGUSER:-}" ]]; then
  echo "Defina PGPASSWORD, PGHOST e PGUSER do projeto da casa."
  exit 1
fi

PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-postgres}"

echo "==> Limpando dados de config (18 tabelas, sem usuários/depositos)..."
for t in $TABLES; do
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
    -c "TRUNCATE TABLE public.\"$t\" RESTART IDENTITY CASCADE;" 2>/dev/null \
    || psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 \
    -c "TRUNCATE TABLE public.$t RESTART IDENTITY CASCADE;"
done

echo "==> Importando config_data.sql da mãe..."
sed '/^\\restrict /d; /^\\unrestrict /d; /DISABLE TRIGGER ALL/d; /ENABLE TRIGGER ALL/d' "$ROOT/config_data.sql" \
  | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=0

echo "OK: dados de design sincronizados."
