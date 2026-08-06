#!/usr/bin/env bash
# Sobe o painel ops na VPS (porta 9090).
# Uso:
#   cd /opt/venuzbet/Ops-Panel
#   cp env.example .env && nano .env
#   ./up.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp env.example .env
  echo "Criado .env — edite OPS_PASSWORD antes de expor na internet."
fi

chmod +x up.sh 2>/dev/null || true
docker compose build
docker compose up -d

IP="$(curl -fsS http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')"
echo
echo "Painel ops: http://${IP}:9090"
echo "Login: usuário/senha do arquivo .env (OPS_USER / OPS_PASSWORD)"
echo "Libere a porta 9090 no Security Group da AWS se não abrir no browser."
