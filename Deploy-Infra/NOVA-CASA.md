# Nova casa em 3 passos

## Setup único na VPS (1x)

```bash
cd /opt/venuzbet/Deploy-Infra
chmod +x scripts/*.sh
./scripts/init-platform-secrets.sh stewgaming
```

Isso copia PlayFivers, CPF Hub, pagamentos etc. para `tenants/_shared/secrets.env`.  
**Nunca mais precisa repetir** — só muda se trocar gateway global.

---

## Nova casa (ex.: bandpiix)

### 1. No PC — registrar a casa (git)

Edite `Deploy-Infra/tenants.registry.json`:

```json
{
  "slug": "bandpiix",
  "label": "Band Piix",
  "domain": "bandpiix.com"
}
```

Depois:

```powershell
git add Deploy-Infra/tenants.registry.json
git commit -m "feat: registra tenant bandpiix"
git push
```

Ou use o helper Windows:

```powershell
.\Deploy-Infra\scripts\registrar-casa.ps1 -Slug bandpiix -Domain bandpiix.com -Label "Band Piix"
git add Deploy-Infra/tenants.registry.json ops-panel/tenants.json Deploy-Infra/docker-compose.yml
git commit -m "feat: registra tenant bandpiix"
git push
```

### 2. Supabase (cloud)

1. Criar **projeto novo** no Supabase
2. SQL Editor → colar `Deploy-Infra/supabase_nova_casa.sql`
3. Criar usuário admin e promover: `UPDATE public.usuarios SET cargo = 'admin' WHERE email = '...'`

### 3. Na VPS — só Supabase + deploy

**Pelo Ops Panel (recomendado):** `http://IP:9090/nova-casa` — preencha slug, domínio e 3 keys Supabase.

**Ou pelo terminal:**
cd /opt/venuzbet && git pull
cd Deploy-Infra

# Primeira vez: cria o arquivo de 3 linhas
./scripts/nova-casa.sh bandpiix
nano tenants/bandpiix/supabase.env   # SUPABASE_URL, ANON_KEY, SERVICE_KEY

# Subir
./scripts/nova-casa.sh bandpiix --deploy
```

Pronto. Site em `https://bandpiix.com`, admin em `https://admin.bandpiix.com`.

---

## O que cada script faz

| Script | Função |
|--------|--------|
| `init-platform-secrets.sh` | 1x — copia secrets globais de uma casa existente |
| `registrar-casa.ps1` | PC — adiciona casa ao registry + sync compose/ops |
| `sync-tenants-registry.sh` | Sync compose + ops-panel a partir do registry |
| `nova-casa.sh` | Monta env.api + nginx + deploy |

---

## Arquivos por casa (só na VPS, não vão pro git)

| Arquivo | Conteúdo |
|---------|----------|
| `tenants/<slug>/supabase.env` | **Só 3 keys** — único arquivo que você edita |
| `tenants/<slug>/env.api` | Gerado automaticamente |
| `tenants/_shared/secrets.env` | Secrets globais (1x) |

---

## DNS (Cloudflare)

| Tipo | Nome | Valor |
|------|------|-------|
| A | `@` | IP da VPS |
| A | `admin` | IP da VPS |
| A | `api` | IP da VPS |

---

## Atalho sem git (só VPS)

```bash
./scripts/nova-casa.sh novacasa --domain novacasa.com --label "Nova Casa" --register
nano tenants/novacasa/supabase.env
./scripts/nova-casa.sh novacasa --deploy
# Depois commit tenants.registry.json do PC
```
