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
$apiContent = $apiContent -replace 'PUBLIC_API_URL=.*', "PUBLIC_API_URL=https://api.$Domain"
$apiContent | Set-Content (Join-Path $TenantDir "env.api") -NoNewline

@"
VITE_API_BASE=https://api.$Domain/api/supabase
VITE_DEPOSIT_API_BASE=https://api.$Domain/api/deposit
VITE_PLAYFIVERS_API_BASE=https://api.$Domain/api/v2
VITE_GAME_LAUNCH_URL=https://api.$Domain/api/game_launch
"@ | Set-Content (Join-Path $TenantDir "env.front")

@"
VITE_API_BASE=https://api.$Domain/api/supabase
VITE_PLAYFIVERS_API_BASE=https://api.$Domain/api/v2
"@ | Set-Content (Join-Path $TenantDir "env.admin")

Write-Host "OK: deploy/tenants/$Tenant/env.* preenchidos (nao vao pro git)."
