#!/usr/bin/env bash
# Aplica só os GRANTs da mãe em uma casa que já tem tabelas (ex.: bandpiix com erro 42501).
#
# Uso:
#   export PGPASSWORD='senha_do_projeto'
#   export PGHOST='aws-X-sa-east-1.pooler.supabase.com'
#   export PGUSER='postgres.REF_DO_PROJETO'
#   ./fix-grants-casa.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${PGPASSWORD:-}" || -z "${PGHOST:-}" || -z "${PGUSER:-}" ]]; then
  echo "Defina PGPASSWORD, PGHOST e PGUSER do projeto da casa."
  exit 1
fi

PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-postgres}"

echo "==> Aplicando grants.sql (privilégios anon/authenticated/service_role)..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$ROOT/grants.sql"

echo "OK: privilégios aplicados. Recarregue o site."
