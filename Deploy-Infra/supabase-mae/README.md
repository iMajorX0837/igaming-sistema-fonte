# Supabase mãe (stewgaming) — export para novas casas

Snapshot do projeto **psoyhrnjnalroihnswoo** (Session pooler `aws-1-sa-east-1`).

## Arquivos

| Arquivo | Conteúdo |
|---------|----------|
| `schema.sql` | Tabelas, colunas, índices, funções, **RLS/policies**, triggers e **GRANTs** `public` |
| `grants.sql` | Só privilégios (anon/authenticated/service_role) — fix rápido em casa existente |
| `config_data.sql` | Dados das **18 tabelas de config** — CMS, banners, jogos, VIP, gateways |
| `auth_trigger.sql` | Trigger `on_auth_user_created` em `auth.users` (cadastro → `public.usuarios`) |
| `config_tables.json` | Lista das tabelas incluídas no dump de dados |

## O que NÃO vai nos dumps (proposital)

Sem dados de jogadores de outra casa:

- `usuarios`, `depositos`, `saques`, `transacoes_jogos`
- `aviator_bets`, `aviator_rounds`, `aviator_velas`
- `cupom_usos`, `prize_wheel_spins`, `bonus_conversoes`, `admin_logs`

## Importar em casa nova

1. Crie projeto Supabase **vazio**
2. Na VPS ou PC com `psql`:

```bash
cd Deploy-Infra/supabase-mae
export PGPASSWORD='SENHA_PROJETO_NOVO'
export PGHOST='aws-X-sa-east-1.pooler.supabase.com'
export PGUSER='postgres.REF_PROJETO_NOVO'
chmod +x import-nova-casa.sh
./import-nova-casa.sh
```

3. Cadastre admin e promova:

```sql
UPDATE public.usuarios SET cargo = 'admin' WHERE email = 'seu@email.com';
```

## Casa existente com erro `permission denied` (42501)

Se o front mostra erro ao buscar `cms_items`, `home_sections`, etc., faltam **GRANTs** no projeto novo.

**Opção A — SQL Editor (mais rápido):** cole e execute todo o arquivo `grants.sql`.

**Opção B — psql:**

```bash
cd Deploy-Infra/supabase-mae
export PGPASSWORD='SENHA_BANDPIIX'
export PGHOST='aws-X-sa-east-1.pooler.supabase.com'
export PGUSER='postgres.REF_BANDPIIX'
chmod +x fix-grants-casa.sh
./fix-grants-casa.sh
```

Para sincronizar só o **design/conteúdo** da mãe (sem mexer em usuários):

```bash
chmod +x sync-config-data-casa.sh
./sync-config-data-casa.sh
```

## Re-exportar da mãe (atualizar snapshot)

**Windows:**

```powershell
$env:PGPASSWORD = 'SENHA_MAE'
.\Deploy-Infra\supabase-mae\export-mae.ps1
```

**Linux/VPS:**

```bash
export PGPASSWORD='SENHA_MAE'
./Deploy-Infra/supabase-mae/export-mae.sh
```

Conexão mãe (Session pooler):

- Host: `aws-1-sa-east-1.pooler.supabase.com`
- User: `postgres.psoyhrnjnalroihnswoo`
- Port: `5432`

## Tabelas de config (18)

`site_config`, `cms_items`, `home_sections`, `home_section_games`, `home_section_providers`, `platform_providers`, `platform_games`, `all_games_categories`, `all_games_providers`, `all_games_page_config`, `vip_niveis`, `prize_wheel_config`, `prize_wheel_segments`, `cupons`, `aviator_config`, `tracking_pixels`, `webhooks`, `integration_secrets`
