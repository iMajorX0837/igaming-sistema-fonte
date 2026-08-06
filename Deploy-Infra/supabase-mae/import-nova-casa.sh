#!/usr/bin/env bash
# Importa schema + config da mãe em um Supabase NOVO (projeto vazio).
#
# Uso:
#   export PGPASSWORD='senha_do_projeto_novo'
#   export PGHOST='aws-0-sa-east-1.pooler.supabase.com'
#   export PGUSER='postgres.REF_DO_PROJETO_NOVO'
#   ./import-nova-casa.sh
#
# Depois:
#   CREATE TRIGGER auth (auth_trigger.sql) — este script já aplica
#   Crie usuário no Auth e promova: UPDATE public.usuarios SET cargo='admin' WHERE email='...';
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${PGPASSWORD:-}" || -z "${PGHOST:-}" || -z "${PGUSER:-}" ]]; then
  echo "Defina PGPASSWORD, PGHOST e PGUSER do projeto NOVO."
  exit 1
fi

PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-postgres}"

echo "==> [0/4] Limpar schema public (import limpo / retry)..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$ROOT/prepare-nova-casa.sql"

echo "==> [1/4] Schema (tabelas, colunas, RLS, funções)..."
# Supabase já vem com schema public — ignora CREATE SCHEMA duplicado
sed '/^\\restrict /d; /^\\unrestrict /d; s/^CREATE SCHEMA public;$/CREATE SCHEMA IF NOT EXISTS public;/' \
  "$ROOT/schema.sql" \
  | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1

echo "==> [2/4] Dados de config (CMS, jogos, VIP, gateways...)..."
sed '/^\\restrict /d; /^\\unrestrict /d; /DISABLE TRIGGER ALL/d; /ENABLE TRIGGER ALL/d' "$ROOT/config_data.sql" \
  | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=0

echo "==> [3/4] Trigger auth.users → public.usuarios..."
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$ROOT/auth_trigger.sql"

echo "OK: import concluído. Crie admin no Auth e promova cargo."
