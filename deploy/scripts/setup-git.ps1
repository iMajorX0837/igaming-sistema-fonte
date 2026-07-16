# Rode no PowerShell (Windows) na pasta do projeto:
#   cd "C:\Users\Lucas\Desktop\VenuzBET"
#   .\deploy\scripts\setup-git.ps1 -GitHubUser SEU_USUARIO -RepoName venuzbet

param(
  [Parameter(Mandatory = $true)]
  [string]$GitHubUser,

  [string]$RepoName = "venuzbet"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Error "Git não instalado. Instale: https://git-scm.com/download/win"
}

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

git add .
$status = git status --porcelain
if (-not $status) {
  Write-Host "Nada novo para commitar."
} else {
  git commit -m "Deploy inicial VenuzBET (Docker multi-tenant)"
  Write-Host "Commit criado."
}

$remote = "https://github.com/$GitHubUser/$RepoName.git"
$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
  git remote add origin $remote
} else {
  git remote set-url origin $remote
}

Write-Host ""
Write-Host "=== Próximos passos ==="
Write-Host "1. Crie repo PRIVADO: https://github.com/new?name=$RepoName"
Write-Host "2. Push:"
Write-Host "   git push -u origin main"
Write-Host ""
Write-Host "3. Na EC2 (root):"
Write-Host "   bash /opt/venuzbet/deploy/scripts/ec2-bootstrap.sh $remote"
Write-Host "   # ou se ainda não clonou:"
Write-Host "   apt install -y docker.io docker-compose-plugin git"
Write-Host "   git clone $remote /opt/venuzbet"
