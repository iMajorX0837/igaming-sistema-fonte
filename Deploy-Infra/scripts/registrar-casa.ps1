# Registra nova casa no git (registry + compose + ops-panel)
# Uso: .\Deploy-Infra\scripts\registrar-casa.ps1 -Slug bandpiix -Domain bandpiix.com -Label "Band Piix"

param(
  [Parameter(Mandatory = $true)]
  [string]$Slug,

  [Parameter(Mandatory = $true)]
  [string]$Domain,

  [Parameter(Mandatory = $true)]
  [string]$Label
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$RegistryPath = Join-Path $Root "Deploy-Infra\tenants.registry.json"

if (-not (Test-Path $RegistryPath)) {
  Write-Error "Não encontrado: $RegistryPath"
}

$registry = Get-Content $RegistryPath -Raw | ConvertFrom-Json
$list = @($registry)

if ($list | Where-Object { $_.slug -eq $Slug }) {
  Write-Host "Tenant '$Slug' já existe no registry."
} else {
  $list += [PSCustomObject]@{ slug = $Slug; label = $Label; domain = $Domain }
  $list | ConvertTo-Json -Depth 4 | Set-Content $RegistryPath -Encoding UTF8
  Write-Host "Adicionado ao registry: $Slug ($Domain)"
}

Push-Location (Join-Path $Root "Deploy-Infra")
try {
  if (Get-Command bash -ErrorAction SilentlyContinue) {
    bash ./scripts/sync-tenants-registry.sh
  } else {
    Write-Warning "bash não encontrado — rode sync-tenants-registry.sh na VPS após git push"
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Próximo passo:"
Write-Host "  git add Deploy-Infra/tenants.registry.json ops-panel/tenants.json Deploy-Infra/docker-compose.yml"
Write-Host "  git commit -m ""feat: registra tenant $Slug"""
Write-Host "  git push"
Write-Host ""
Write-Host "Na VPS:"
Write-Host "  nano Deploy-Infra/tenants/$Slug/supabase.env"
Write-Host "  ./scripts/nova-casa.sh $Slug --deploy"
