#!/usr/bin/env bash
# Setup sem domínio — igual ao local (paths /api/ relativos).
# Uso: ./scripts/setup-ip-only.sh [IP_PUBLICO]
# Ex.: ./scripts/setup-ip-only.sh 15.228.194.122

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SLUG=venuz
IP="${1:-}"
if [[ -z "$IP" ]]; then
  IP="$(curl -fsSL https://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || true)"
fi
if [[ -z "$IP" ]]; then
  IP="$(hostname -I | awk '{print $1}')"
fi

mkdir -p "tenants/$SLUG/front" "tenants/$SLUG/admin"

if [[ ! -f "tenants/$SLUG/env.api" ]]; then
  echo "Crie tenants/$SLUG/env.api antes (copie do PlayFiverAPI/.env local)."
  echo "  PUBLIC_API_URL=http://$IP"
  exit 1
fi

# Garante PUBLIC_API_URL com IP
sed -i "s|^PUBLIC_API_URL=.*|PUBLIC_API_URL=http://$IP|" "tenants/$SLUG/env.api"

# Front/admin iguais ao .env local (paths relativos)
cat > "tenants/$SLUG/env.front" <<'EOF'
VITE_API_BASE=/api/supabase
VITE_PLAYFIVERS_API_BASE=/api/v2
VITE_DEPOSIT_API_BASE=/api/deposit
VITE_GAME_LAUNCH_URL=/api/game_launch
EOF

cat > "tenants/$SLUG/env.admin" <<'EOF'
VITE_API_BASE=/api/supabase
VITE_PLAYFIVERS_API_BASE=/api/v2
EOF

cp nginx/conf.d/ip-only.conf.example "nginx/conf.d/ip-only.conf"
sed -i "s/api_venuz/api_$SLUG/g" "nginx/conf.d/ip-only.conf"
sed -i "s/api-venuz/api-$SLUG/g" "nginx/conf.d/ip-only.conf"
sed -i "s|/tenants/venuz/|/tenants/$SLUG/|g" "nginx/conf.d/ip-only.conf"

COMPOSE_FILE="docker-compose.yml"
if ! grep -q "api-$SLUG:" "$COMPOSE_FILE"; then
  cat >> "$COMPOSE_FILE" <<YAML

  api-$SLUG:
    <<: *api-base
    container_name: api-$SLUG
    env_file:
      - ./tenants/$SLUG/env.api
    profiles:
      - $SLUG
      - ip
      - all
YAML
fi

# Nginx expõe admin na 8080
if ! grep -q '"8080:8080"' "$COMPOSE_FILE"; then
  sed -i 's/- "443:443"/- "443:443"\n      - "8080:8080"/' "$COMPOSE_FILE"
fi

echo ""
echo "IP-only configurado: $IP"
echo "  Site:  http://$IP/"
echo "  Admin: http://$IP:8080/"
echo "  API:   http://$IP/api/supabase (via nginx)"
echo ""
echo "Próximo:"
echo "  ./scripts/build-tenant.sh $SLUG"
echo "  docker compose --profile $SLUG up -d nginx api-$SLUG"
echo ""
echo "AWS Security Group: libere portas 80 e 8080"
