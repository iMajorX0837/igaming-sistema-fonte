# Export Supabase mãe (Windows)
# Uso: $env:PGPASSWORD = 'SUA_SENHA'; .\export-mae.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Out = $Root

$pgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
if (-not (Test-Path $pgDump)) {
  $pgDump = (Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter pg_dump.exe -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
}
if (-not $pgDump) { throw "pg_dump não encontrado. Instale PostgreSQL." }

if (-not $env:PGPASSWORD) { throw "Defina `$env:PGPASSWORD antes de rodar." }

$HostName = if ($env:PGHOST) { $env:PGHOST } else { "aws-1-sa-east-1.pooler.supabase.com" }
$Port = if ($env:PGPORT) { $env:PGPORT } else { "5432" }
$User = if ($env:PGUSER) { $env:PGUSER } else { "postgres.psoyhrnjnalroihnswoo" }

Write-Host "==> Schema public (tabelas, colunas, RLS, funções, triggers, GRANTs)..."
& $pgDump -h $HostName -p $Port -U $User -d postgres `
  --schema=public --schema-only --no-owner `
  --file="$Out\schema.sql"

Write-Host "==> Privilégios (grants.sql)..."
$grantLines = @(
  "-- Privilégios extraídos da Supabase mãe (public)",
  "-- Rode no SQL Editor se aparecer permission denied (42501) para anon",
  "-- Gerado por export-mae.ps1 em $(Get-Date -Format o)",
  ""
)
$grantLines += Select-String -Path "$Out\schema.sql" -Pattern '^(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES)' | ForEach-Object { $_.Line }
$grantLines | Set-Content -Encoding utf8 "$Out\grants.sql"

$tables = Get-Content "$Out\config_tables.json" -Raw | ConvertFrom-Json
$args = @("-h",$HostName,"-p",$Port,"-U",$User,"-d","postgres","--data-only","--no-owner","--no-privileges","--disable-triggers")
foreach ($t in $tables) { $args += "-t"; $args += "public.$t" }

Write-Host "==> Dados de config ($($tables.Count) tabelas)..."
& $pgDump @args --file="$Out\config_data.sql"

Write-Host "OK: $Out\schema.sql + grants.sql + config_data.sql"
