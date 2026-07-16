# VenuzBET — Tutorial de Deploy (EC2 + Docker)

Guia completo para hospedar o sistema na AWS (Ubuntu) com Docker Compose, domínio e multi-tenant.

---

## Arquitetura

```
Internet
   │
   ▼
 Nginx (porta 80/443/8080)
   ├── stewgaming.com          → tenants/stewgaming/front
   ├── admin.stewgaming.com    → tenants/stewgaming/admin
   └── api.stewgaming.com      → api-stewgaming:3000 (Node + Aviator Python)

Supabase → nuvem (não roda na VPS)
```

**1 marca (tenant)** = 1 domínio + 1 API container + 1 projeto Supabase.

---

## Requisitos

| Item | Valor |
|------|-------|
| VPS | AWS EC2 Ubuntu 24.04, 2 vCPU / 4 GB RAM (mínimo) |
| Portas AWS | 22, 80, 443, 8080 (8080 só se usar admin por IP) |
| Domínio | ex.: stewgaming.com (Namecheap, Cloudflare, etc.) |
| Repo | https://github.com/iMajorX0837/igaming-sistema-fonte |

---

## PARTE 1 — EC2 (primeira vez)

### 1.1 Criar instância AWS

- AMI: **Ubuntu Server 24.04 LTS (x86)**
- Tipo: `t3.medium` ou superior
- Security Group: liberar **22, 80, 443** (8080 opcional)
- Par de chaves SSH (.pem) ou EC2 Instance Connect

### 1.2 Acesso SSH

```bash
ssh root@SEU_IP
# ou
ssh -i sua-chave.pem ubuntu@SEU_IP
```

Usuário padrão Ubuntu: `ubuntu` (tem sudo). Root exige configuração manual.

### 1.3 Instalar Docker

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git

systemctl enable docker && systemctl start docker
docker --version
docker compose version
```

### 1.4 Clonar projeto

```bash
git clone https://github.com/iMajorX0837/igaming-sistema-fonte.git /opt/venuzbet
cd /opt/venuzbet/deploy
chmod +x scripts/*.sh
```

---

## PARTE 2 — Modo IP (teste sem domínio)

Use enquanto não tem domínio. Acessa pelo IP da EC2.

### 2.1 Criar env da API

```bash
mkdir -p tenants/venuz/front tenants/venuz/admin

cat > tenants/venuz/env.api << 'EOF'
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_KEY=sua_service_key
PORT=3000
PUBLIC_API_URL=http://SEU_IP
GAME_LAUNCH_MOCK=false
AVIATOR_GAME_ENABLED=true
AVIATOR_PYTHON_PORT=8001
AVIATOR_PYTHON_AUTOSTART=true
MISTICPAY_CI=...
MISTICPAY_CS=...
MISTICPAY_API_URL=https://api.misticpay.com/api
CPFHUB_API_KEY=...
EOF
```

### 2.2 Setup IP-only

```bash
./scripts/setup-ip-only.sh SEU_IP
./scripts/build-tenant.sh venuz
docker compose --profile venuz up -d nginx api-venuz
```

### 2.3 URLs (modo IP)

| O quê | URL |
|-------|-----|
| Site | http://SEU_IP/ |
| Admin | http://SEU_IP:8080/ |
| Health | http://SEU_IP/health |

Front/admin usam paths relativos `/api/...` (igual ao localhost).

---

## PARTE 3 — Domínio (produção)

Exemplo: **stewgaming.com** | IP: **15.228.194.122**

### 3.1 DNS (Namecheap → Advanced DNS)

| Type | Host | Value |
|------|------|-------|
| A Record | `@` | IP_DA_EC2 |
| A Record | `admin` | IP_DA_EC2 |
| A Record | `api` | IP_DA_EC2 |

**Importante:** use **A Record**, não URL Redirect.

### 3.2 Criar tenant

```bash
cd /opt/venuzbet/deploy
./scripts/add-tenant.sh stewgaming stewgaming.com
```

Isso cria:
- `tenants/stewgaming/env.api`, `env.front`, `env.admin`
- `nginx/conf.d/stewgaming.conf` (via template)
- serviço `api-stewgaming` no `docker-compose.yml`

### 3.3 Configurar secrets

```bash
# Copiar do tenant IP ou editar manualmente
cp tenants/venuz/env.api tenants/stewgaming/env.api
sed -i 's|PUBLIC_API_URL=.*|PUBLIC_API_URL=https://api.stewgaming.com|' tenants/stewgaming/env.api
nano tenants/stewgaming/env.api   # conferir Supabase, MisticPay, etc.
```

### 3.4 Nginx (gerar conf do template)

```bash
rm -f nginx/conf.d/ip-only.conf
rm -f nginx/conf.d/zorbybet.conf nginx/conf.d/weavenbet.conf

sed -e 's/___SLUG__/stewgaming/g' -e 's/___DOMAIN___/stewgaming.com/g' \
  nginx/conf.d/tenant.conf.template > nginx/conf.d/stewgaming.conf

grep server_name nginx/conf.d/stewgaming.conf
```

Deve listar: `stewgaming.com`, `admin.stewgaming.com`, `api.stewgaming.com`.

### 3.5 Build + subir

```bash
./scripts/build-tenant.sh stewgaming
docker compose --profile stewgaming up -d nginx api-stewgaming
docker compose stop api-venuz   # para tenant IP-only se existir
```

### 3.6 Testar

```bash
docker compose ps
curl -s -H "Host: stewgaming.com" http://127.0.0.1/ | grep -i "<title>"
curl -s -H "Host: admin.stewgaming.com" http://127.0.0.1/ | grep -i "<title>"
curl http://127.0.0.1/health
```

Esperado:
- **stewgaming.com** → `RoyalBet | Apostas Online...`
- **admin.stewgaming.com** → `Admin Painel - RoyalBET`

### 3.7 URLs finais

| O quê | URL |
|-------|-----|
| Site | http://stewgaming.com |
| Admin | http://admin.stewgaming.com |
| API | http://api.stewgaming.com/health |

---

## PARTE 4 — HTTPS (Let's Encrypt grátis)

Depois que HTTP funcionar e DNS propagado:

```bash
apt install -y certbot
docker compose stop nginx

certbot certonly --standalone \
  -d stewgaming.com \
  -d www.stewgaming.com \
  -d admin.stewgaming.com \
  -d api.stewgaming.com

docker compose start nginx
```

Depois configure SSL no nginx (montar `/etc/letsencrypt` no container ou usar Cloudflare Proxy).

**Alternativa fácil:** Cloudflare DNS com proxy laranja → HTTPS automático.

---

## PARTE 5 — Adicionar nova marca (2ª, 3ª…)

Para **zorbybet.com**:

```bash
./scripts/add-tenant.sh zorbybet zorbybet.com
cp tenants/_template/env.api.example tenants/zorbybet/env.api   # ou copiar de outro tenant
nano tenants/zorbybet/env.api

sed -e 's/___SLUG__/zorbybet/g' -e 's/___DOMAIN___/zorbybet.com/g' \
  nginx/conf.d/tenant.conf.template > nginx/conf.d/zorbybet.conf

./scripts/build-tenant.sh zorbybet
docker compose --profile zorbybet up -d nginx api-zorbybet
docker compose exec nginx nginx -s reload
```

DNS de zorbybet.com → mesmo IP da EC2 (`@`, `admin`, `api`).

Cada marca = **1 Supabase separado** + credenciais MisticPay próprias.

---

## PARTE 6 — Atualizar código

### No PC (Windows)

```powershell
cd "C:\Users\Lucas\Desktop\VenuzBET"
git add .
git commit -m "descricao da mudanca"
git push
```

### Na EC2

```bash
cd /opt/venuzbet
git pull
cd deploy

# Se mudou só API:
docker compose build
docker compose --profile stewgaming up -d --force-recreate api-stewgaming

# Se mudou front/admin:
./scripts/build-tenant.sh stewgaming
docker compose restart nginx
```

---

## PARTE 7 — Comandos úteis

```bash
cd /opt/venuzbet/deploy

docker compose ps                          # status
docker compose logs -f api-stewgaming      # logs API
docker compose logs -f nginx               # logs nginx
docker compose restart nginx              # reiniciar nginx
docker compose --profile stewgaming down   # parar tenant
docker compose exec nginx nginx -t         # testar config nginx
```

---

## PARTE 8 — Problemas comuns

### Nginx em Restarting

**Causa:** conf apontando para container que não existe (ex.: `api-zorbybet` parado).

```bash
rm -f nginx/conf.d/zorbybet.conf nginx/conf.d/weavenbet.conf
# Manter só confs de tenants ATIVOS
docker compose restart nginx
```

### admin.dominio.com abre o site (cassino)

**Causa:** nginx conf errado ou não reiniciado.

```bash
grep -i "<title>" tenants/SLUG/front/index.html   # RoyalBet
grep -i "<title>" tenants/SLUG/admin/index.html   # Admin Painel

sed -e 's/___SLUG__/SLUG/g' -e 's/___DOMAIN___/dominio.com/g' \
  nginx/conf.d/tenant.conf.template > nginx/conf.d/SLUG.conf

docker compose exec nginx nginx -t
docker compose restart nginx

curl -s -H "Host: admin.dominio.com" http://127.0.0.1/ | grep title
```

### docker-compose.yml inválido após add-tenant

```bash
cd /opt/venuzbet
git checkout deploy/docker-compose.yml
git pull
```

### git pull bloqueado (local changes)

```bash
git checkout -- deploy/docker-compose.yml deploy/scripts/add-tenant.sh
git pull
```

### API não responde / login falha

- Conferir `PUBLIC_API_URL=https://api.dominio.com` no `env.api`
- Front buildado com `https://api.dominio.com/...` nos env.front/admin
- HTTPS precisa estar ativo se URLs usam `https://`
- Security Group: portas 80 e 443 abertas

### Build lento na 1ª vez

Normal (~5–10 min). Próximas vezes usa cache Docker.

---

## PARTE 9 — Estrutura de pastas

```
/opt/venuzbet/
├── PlayFiverAPI/          # API Node + Aviator
├── VenuzBET - Front/      # Site
├── AdminPainel/           # Admin
└── deploy/
    ├── docker-compose.yml
    ├── Dockerfile.api
    ├── Dockerfile.front
    ├── Dockerfile.admin
    ├── nginx/
    │   ├── nginx.conf
    │   └── conf.d/
    │       ├── tenant.conf.template
    │       └── stewgaming.conf      # gerado (não commitar)
    ├── tenants/
    │   └── stewgaming/
    │       ├── env.api              # secrets (não commitar)
    │       ├── env.front
    │       ├── env.admin
    │       ├── front/               # build site
    │       └── admin/               # build admin
    └── scripts/
        ├── add-tenant.sh
        ├── build-tenant.sh
        ├── setup-ip-only.sh
        ├── up-tenant.sh
        └── up-all.sh
```

---

## PARTE 10 — Checklist deploy novo tenant

- [ ] DNS: `@`, `admin`, `api` → IP da EC2
- [ ] `./scripts/add-tenant.sh slug dominio.com`
- [ ] `tenants/slug/env.api` preenchido (Supabase, MisticPay, PUBLIC_API_URL)
- [ ] Nginx conf gerado do template
- [ ] `./scripts/build-tenant.sh slug`
- [ ] `docker compose --profile slug up -d nginx api-slug`
- [ ] curl title: site ≠ admin
- [ ] Admin user criado no Supabase (`cargo = admin`)
- [ ] Webhooks MisticPay → `https://api.dominio.com/...`
- [ ] HTTPS configurado (Certbot ou Cloudflare)

---

## Referência rápida — stewgaming.com

```bash
cd /opt/venuzbet/deploy
git pull
./scripts/add-tenant.sh stewgaming stewgaming.com
cp tenants/venuz/env.api tenants/stewgaming/env.api
sed -i 's|PUBLIC_API_URL=.*|PUBLIC_API_URL=https://api.stewgaming.com|' tenants/stewgaming/env.api
rm -f nginx/conf.d/ip-only.conf
sed -e 's/___SLUG__/stewgaming/g' -e 's/___DOMAIN___/stewgaming.com/g' \
  nginx/conf.d/tenant.conf.template > nginx/conf.d/stewgaming.conf
./scripts/build-tenant.sh stewgaming
docker compose --profile stewgaming up -d nginx api-stewgaming
docker compose stop api-venuz
docker compose ps
```

---

*Última atualização: deploy EC2 sa-east-1 | stewgaming.com | Docker Compose multi-tenant*
