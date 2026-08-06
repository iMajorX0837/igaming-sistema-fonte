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

Write-Host "==> Schema public..."
& $pgDump -h $HostName -p $Port -U $User -d postgres `
  --schema=public --schema-only --no-owner --no-privileges `
  --file="$Out\schema.sql"

$tables = Get-Content "$Out\config_tables.json" -Raw | ConvertFrom-Json
$args = @("-h",$HostName,"-p",$Port,"-U",$User,"-d","postgres","--data-only","--no-owner","--no-privileges","--disable-triggers")
foreach ($t in $tables) { $args += "-t"; $args += "public.$t" }

Write-Host "==> Dados de config ($($tables.Count) tabelas)..."
& $pgDump @args --file="$Out\config_data.sql"

Write-Host "OK: $Out\schema.sql + config_data.sql"
