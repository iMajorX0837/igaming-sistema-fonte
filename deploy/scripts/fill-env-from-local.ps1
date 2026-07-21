@echo off
REM Copia secrets locais para template do tenant (NA VPS, após add-tenant).
REM Uso: deploy\scripts\fill-env-from-local.ps1 -Tenant zorbybet -Domain zorbybet.com

param(
  [Parameter(Mandatory = $true)]
  [string]$Tenant,

  [Parameter(Mandatory = $true)]
  [string]$Domain
)

$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$TenantDir = Join-Path $Root "deploy\tenants\$Tenant"
$ApiLocal = Join-Path $Root "PlayFiverAPI\.env"

if (-not (Test-Path $TenantDir)) {
  Write-Error "Tenant não existe. Rode add-tenant.sh na VPS ou crie a pasta primeiro."
}

if (-not (Test-Path $ApiLocal)) {
  Write-Error "PlayFiverAPI\.env não encontrado."
}

$apiContent = Get-Content $ApiLocal -Raw
$apiContent = $apiContent -replace '(?m)^PUBLIC_API_URL=.*', "PUBLIC_API_URL=https://api.$Domain"
if ($apiContent -notmatch '(?m)^NODE_ENV=') {
  $apiContent = "# --- Ambiente ---`r`nNODE_ENV=production`r`n" + $apiContent
} else {
  $apiContent = $apiContent -replace '(?m)^NODE_ENV=.*', 'NODE_ENV=production'
}
if ($apiContent -notmatch '(?m)^CORS_ORIGINS=') {
  $apiContent += "`r`nCORS_ORIGINS=https://$Domain,https://www.$Domain,https://admin.$Domain"
}
$apiContent | Set-Content (Join-Path $TenantDir "env.api") -NoNewline

@"
# Deploy tenant — Front
VITE_API_BASE=/api/supabase
VITE_DEPOSIT_API_BASE=/api/deposit
VITE_PLAYFIVERS_API_BASE=/api/v2
VITE_GAME_LAUNCH_URL=/api/game_launch
"@ | Set-Content (Join-Path $TenantDir "env.front")

@"
# Deploy tenant — Admin
VITE_API_BASE=/api/supabase
VITE_PLAYFIVERS_API_BASE=/api/v2
VITE_PLAYFIVERS_QUEUE_CONCURRENCY=1
VITE_PLAYFIVERS_QUEUE_INTERVAL_MS=400
"@ | Set-Content (Join-Path $TenantDir "env.admin")

Write-Host "OK: deploy/tenants/$Tenant/env.* preenchidos (nao vao pro git)."
