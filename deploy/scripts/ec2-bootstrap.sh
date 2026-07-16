#!/usr/bin/env bash
# Setup inicial na EC2 (Ubuntu). Rode como root:
# curl -fsSL ... | bash   OU   bash deploy/scripts/ec2-bootstrap.sh

set -euo pipefail

REPO_URL="${1:-}"

echo "==> Atualizando sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Instalando Docker, Git, Curl"
apt-get install -y docker.io docker-compose-plugin git curl

systemctl enable docker
systemctl start docker

echo "==> Docker:"
docker --version
docker compose version

if [[ -n "$REPO_URL" ]]; then
  echo "==> Clonando $REPO_URL"
  rm -rf /opt/venuzbet
  git clone "$REPO_URL" /opt/venuzbet
else
  echo "==> Clone manual: git clone SEU_REPO /opt/venuzbet"
fi

if [[ -d /opt/venuzbet/deploy ]]; then
  chmod +x /opt/venuzbet/deploy/scripts/*.sh
  echo "==> OK. Próximo:"
  echo "    cd /opt/venuzbet/deploy"
  echo "    ./scripts/add-tenant.sh SLUG dominio.com"
  echo "    nano tenants/SLUG/env.api"
  echo "    ./scripts/build-tenant.sh SLUG"
  echo "    ./scripts/up-tenant.sh SLUG"
else
  echo "==> Pasta deploy não encontrada. Faça git clone primeiro."
fi
