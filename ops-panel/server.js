const express = require('express');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { collectSystemStats } = require('./systemStats');
const { validateNewTenantInput, parseSupabasePaste } = require('./parseSupabase');

const ROOT = __dirname;
const REPO_ROOT = process.env.REPO_ROOT || '/opt/venuzbet';

function resolveDeployDir() {
  const candidates = [
    process.env.DEPLOY_DIR,
    path.join(REPO_ROOT, 'Deploy-Infra'),
    path.join(REPO_ROOT, 'deploy'),
  ].filter(Boolean);

  const seen = new Set();
  for (const dir of candidates) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    if (fs.existsSync(path.join(dir, 'scripts'))) {
      return dir;
    }
  }

  return process.env.DEPLOY_DIR || path.join(REPO_ROOT, 'Deploy-Infra');
}

const DEPLOY_DIR = resolveDeployDir();
const PORT = Number(process.env.OPS_PORT || 9090);
const OPS_USER = process.env.OPS_USER || 'admin';
const OPS_PASSWORD = process.env.OPS_PASSWORD || '';

const REGISTRY_PATH = path.join(DEPLOY_DIR, 'tenants.registry.json');
const TENANTS_JSON = path.join(REPO_ROOT, 'ops-panel', 'tenants.json');
const SHARED_SECRETS = path.join(DEPLOY_DIR, 'tenants/_shared/secrets.env');
const SKIP_TENANT_DIRS = new Set(['_shared', '_template']);

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function titleCaseSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function domainFromPublicSiteUrl(raw) {
  try {
    return new URL(String(raw).trim()).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function tenantDirIsValid(slug) {
  const dir = path.join(DEPLOY_DIR, 'tenants', slug);
  return (
    fs.existsSync(path.join(dir, 'env.api')) ||
    fs.existsSync(path.join(dir, 'supabase.env'))
  );
}

function readTenantMetaFromDisk(slug) {
  let domain = `${slug}.com`;
  let label = titleCaseSlug(slug);

  const envApi = path.join(DEPLOY_DIR, 'tenants', slug, 'env.api');
  if (fs.existsSync(envApi)) {
    const content = fs.readFileSync(envApi, 'utf8');
    const siteMatch = content.match(/^PUBLIC_SITE_URL=(.+)$/m);
    if (siteMatch) {
      const parsed = domainFromPublicSiteUrl(siteMatch[1]);
      if (parsed) domain = parsed;
    }
  }

  return { slug, label, domain };
}

function discoverTenantSlugs() {
  const slugs = new Set();

  const tenantsDir = path.join(DEPLOY_DIR, 'tenants');
  if (fs.existsSync(tenantsDir)) {
    for (const name of fs.readdirSync(tenantsDir)) {
      if (SKIP_TENANT_DIRS.has(name) || name.startsWith('.')) continue;
      const full = path.join(tenantsDir, name);
      if (fs.statSync(full).isDirectory() && tenantDirIsValid(name)) {
        slugs.add(name);
      }
    }
  }

  const nginxDir = path.join(DEPLOY_DIR, 'nginx/conf.d');
  if (fs.existsSync(nginxDir)) {
    for (const file of fs.readdirSync(nginxDir)) {
      if (!file.endsWith('.conf') || file.includes('.stopped')) continue;
      if (file === 'ip-only.conf') continue;
      const slug = file.replace(/\.conf$/, '');
      if (tenantDirIsValid(slug)) slugs.add(slug);
    }
  }

  return [...slugs];
}

function syncRegistryFromDisk() {
  const registry = loadRegistry();
  const known = new Set(registry.map((t) => t.slug));
  const discovered = discoverTenantSlugs().filter((slug) => !known.has(slug));
  if (discovered.length === 0) return registry;

  const merged = [
    ...registry,
    ...discovered.map((slug) => readTenantMetaFromDisk(slug)),
  ].sort((a, b) => a.slug.localeCompare(b.slug));

  saveRegistry(merged);

  const syncScript = path.join(scriptsDir(), 'sync-tenants-registry.sh');
  if (fs.existsSync(syncScript)) {
    execFile('bash', [syncScript], { cwd: DEPLOY_DIR }, () => {});
  }

  console.log(
    `[Ops-Panel] Registry auto-heal: ${discovered.map((s) => s).join(', ')} (pastas VPS, ex.: após git reset)`
  );

  return merged;
}

function loadTenants() {
  return syncRegistryFromDisk();
}

function saveRegistry(list) {
  const body = `${JSON.stringify(list, null, 2)}\n`;
  fs.writeFileSync(REGISTRY_PATH, body, 'utf8');
  try {
    fs.writeFileSync(TENANTS_JSON, body, 'utf8');
  } catch {
    // ops-panel/tenants.json no host pode não existir em dev local
  }
}

function saveTenants(list) {
  saveRegistry(list);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function scriptsDir() {
  return path.join(DEPLOY_DIR, 'scripts');
}

function chmodScriptsCmd() {
  return `find ${shellQuote(scriptsDir())} -maxdepth 1 -name '*.sh' -exec chmod +x {} +`;
}

function scriptCmd(name, args = '') {
  return `${shellQuote(path.join(scriptsDir(), name))}${args ? ` ${args}` : ''}`;
}

function assertDeployReady(scriptName) {
  const dir = scriptsDir();
  if (!fs.existsSync(dir)) {
    throw Object.assign(
      new Error(
        `Pasta ${dir} não existe. Na VPS: cd ${REPO_ROOT} && git fetch origin && git reset --hard origin/main && cd ops-panel && docker compose up -d --build`
      ),
      { status: 400 }
    );
  }
  if (scriptName) {
    const scriptPath = path.join(dir, scriptName);
    if (!fs.existsSync(scriptPath)) {
      throw Object.assign(
        new Error(`${scriptPath} não existe. Atualize o repo na VPS (git pull).`),
        { status: 400 }
      );
    }
  }
}

function assertTenant(slug) {
  if (!loadTenants().some((t) => t.slug === slug)) {
    const err = new Error(`Tenant inválido: ${slug}`);
    err.status = 400;
    throw err;
  }
}

function buildImportAndDeployCommand(data) {
  const maeDir = path.join(DEPLOY_DIR, 'supabase-mae');
  const pg = data.postgres;
  const importCmd = [
    `export PGPASSWORD=${shellQuote(pg.password)} PGHOST=${shellQuote(pg.host)} PGPORT=${shellQuote(pg.port)} PGUSER=${shellQuote(pg.user)} PGDATABASE=${shellQuote(pg.database)}`,
    `cd ${shellQuote(maeDir)}`,
    'chmod +x import-nova-casa.sh',
    './import-nova-casa.sh',
  ].join(' && ');

  const deployCmd = [
    `cd ${shellQuote(DEPLOY_DIR)}`,
    chmodScriptsCmd(),
    scriptCmd('sync-tenants-registry.sh'),
    scriptCmd('nova-casa.sh', `${shellQuote(data.slug)}${data.deploy ? ' --deploy' : ''}`),
  ].join(' && ');

  return `${importCmd} && ${deployCmd}`;
}

if (!OPS_PASSWORD || OPS_PASSWORD === 'troque-esta-senha') {
  console.warn('[Ops-Panel] AVISO: defina OPS_PASSWORD no arquivo .env');
}

console.log(
  `[Ops-Panel] REPO_ROOT=${REPO_ROOT} DEPLOY_DIR=${DEPLOY_DIR} scripts=${fs.existsSync(scriptsDir())}`
);

/** @type {{ id: string, label: string, running: boolean, output: string, code: number|null, startedAt: string, endedAt?: string }} */
let activeJob = null;

/** @type {import('child_process').ChildProcess | null} */
let activeLogStream = null;

const app = express();
app.use(express.json({ limit: '128kb' }));

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm="Stew Gaming Ops"');
  return res.status(401).send('Autenticação necessária');
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return unauthorized(res);

  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return unauthorized(res);
  }

  const sep = decoded.indexOf(':');
  const user = sep >= 0 ? decoded.slice(0, sep) : decoded;
  const pass = sep >= 0 ? decoded.slice(sep + 1) : '';

  if (user !== OPS_USER || pass !== OPS_PASSWORD) return unauthorized(res);
  return next();
}

function runShell(command, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    execFile(
      'bash',
      ['-lc', command],
      {
        cwd: DEPLOY_DIR,
        timeout: timeoutMs,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' },
      },
      (error, stdout, stderr) => {
        const output = [stdout, stderr].filter(Boolean).join('\n').trim();
        if (error) {
          const err = new Error(output || error.message);
          err.code = error.code;
          reject(err);
          return;
        }
        resolve(output);
      }
    );
  });
}

function startJob(label, command) {
  if (activeJob?.running) {
    const err = new Error('Já existe uma operação em andamento. Aguarde terminar.');
    err.status = 409;
    throw err;
  }

  if (!fs.existsSync(DEPLOY_DIR)) {
    const err = new Error(`DEPLOY_DIR inexistente: ${DEPLOY_DIR}`);
    err.status = 400;
    throw err;
  }

  const id = crypto.randomBytes(6).toString('hex');
  activeJob = {
    id,
    label,
    running: true,
    output: `==> ${label}\n`,
    code: null,
    startedAt: new Date().toISOString(),
  };

  const child = spawn('bash', ['-lc', command], {
    cwd: DEPLOY_DIR,
    env: process.env,
  });

  const append = (chunk) => {
    activeJob.output += chunk.toString();
    if (activeJob.output.length > 500000) {
      activeJob.output = activeJob.output.slice(-400000);
    }
  };

  child.stdout.on('data', append);
  child.stderr.on('data', append);
  child.on('close', (code) => {
    activeJob.running = false;
    activeJob.code = code;
    activeJob.endedAt = new Date().toISOString();
    activeJob.output += `\n==> Finalizado (exit ${code})\n`;
  });

  return id;
}

function stopTenantCommand(slug) {
  return `
    docker stop api-${slug} 2>/dev/null || true
    if [ -f nginx/conf.d/${slug}.conf ]; then
      mv nginx/conf.d/${slug}.conf nginx/conf.d/${slug}.conf.stopped
    fi
    docker exec venuz-nginx nginx -t && docker exec venuz-nginx nginx -s reload
  `;
}

function startTenantCommand(slug) {
  return `
    if [ -f nginx/conf.d/${slug}.conf.stopped ]; then
      mv nginx/conf.d/${slug}.conf.stopped nginx/conf.d/${slug}.conf
    elif [ ! -f nginx/conf.d/${slug}.conf ]; then
      bash scripts/ensure-tenant-compose.sh ${slug}
    fi
    docker start api-${slug}
    sleep 2
    docker exec venuz-nginx nginx -t && docker exec venuz-nginx nginx -s reload
  `;
}

function restartTenantCommand(slug) {
  return `
    if [ -f nginx/conf.d/${slug}.conf.stopped ]; then
      mv nginx/conf.d/${slug}.conf.stopped nginx/conf.d/${slug}.conf
    fi
    docker restart api-${slug}
    docker exec venuz-nginx nginx -t && docker exec venuz-nginx nginx -s reload
  `;
}

async function isTenantNginxEnabled(slug) {
  try {
    await runShell(`test -f nginx/conf.d/${slug}.conf`, 10000);
    return true;
  } catch {
    return false;
  }
}

app.use(auth);
app.use(express.static(path.join(ROOT, 'public')));

app.get('/api/tenants', (_req, res) => {
  res.json({ tenants: loadTenants() });
});

app.get('/api/platform', (_req, res) => {
  const scripts = scriptsDir();
  res.json({
    sharedSecretsReady: fs.existsSync(SHARED_SECRETS),
    scriptsReady: fs.existsSync(scripts),
    deployDir: DEPLOY_DIR,
    deployDirExists: fs.existsSync(DEPLOY_DIR),
    repoRoot: REPO_ROOT,
    registryPath: REGISTRY_PATH,
    hint: !fs.existsSync(scripts)
      ? `Na VPS: cd ${REPO_ROOT} && git fetch origin && git reset --hard origin/main && cd ops-panel && docker compose up -d --build`
      : null,
  });
});

app.post('/api/platform/init-secrets', (_req, res) => {
  try {
    if (activeJob?.running) {
      res.status(409).json({ error: 'Aguarde a operação atual terminar.' });
      return;
    }
    assertDeployReady('init-platform-secrets.sh');
    const cmd = `${chmodScriptsCmd()} && ${scriptCmd('init-platform-secrets.sh', 'stewgaming')}`;
    const id = startJob('Init secrets compartilhados', cmd);
    res.json({ ok: true, jobId: id, message: 'Copiando secrets da stewgaming...' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/tenants/parse-paste', (req, res) => {
  try {
    const parsed = parseSupabasePaste(req.body?.supabasePaste || req.body?.paste || '');
    res.json({
      ok: true,
      projectRef: parsed.projectRef,
      supabaseUrl: parsed.supabaseUrl,
      host: parsed.postgres.host,
      hasAnonKey: parsed.supabaseAnonKey.length >= 20,
      hasServiceKey: parsed.supabaseServiceKey.length >= 20,
    });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

app.post('/api/tenants/create', (req, res) => {
  try {
    if (activeJob?.running) {
      res.status(409).json({ error: 'Aguarde a operação atual terminar.' });
      return;
    }

    if (!fs.existsSync(SHARED_SECRETS)) {
      res.status(400).json({
        error: 'Secrets compartilhados não configurados. Use "Preparar plataforma" na tela Nova casa.',
      });
      return;
    }

    const data = validateNewTenantInput(req.body || {});
    const registry = loadRegistry();
    if (registry.some((t) => t.slug === data.slug)) {
      res.status(409).json({
        error: `Casa "${data.slug}" já existe no registry. Use Deploy na casa existente ou exclua antes.`,
      });
      return;
    }

    const tenantDir = path.join(DEPLOY_DIR, 'tenants', data.slug);
    fs.mkdirSync(tenantDir, { recursive: true });

    const supabaseEnv = [
      `SUPABASE_URL=${data.supabaseUrl}`,
      `SUPABASE_ANON_KEY=${data.supabaseAnonKey}`,
      `SUPABASE_SERVICE_KEY=${data.supabaseServiceKey}`,
      '',
    ].join('\n');
    fs.writeFileSync(path.join(tenantDir, 'supabase.env'), supabaseEnv, { mode: 0o600 });

    registry.push({ slug: data.slug, label: data.label, domain: data.domain });
    saveRegistry(registry);
    saveTenants(registry);

    const cmd = buildImportAndDeployCommand(data);
    const id = startJob(`Nova casa — ${data.slug}`, cmd);

    res.json({
      ok: true,
      jobId: id,
      slug: data.slug,
      domain: data.domain,
      projectRef: data.projectRef,
      message: data.deploy
        ? 'Importando Supabase da mãe + deploy em andamento'
        : 'Importando Supabase da mãe (sem deploy)',
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get('/api/status', async (_req, res) => {
  try {
    const tenants = loadTenants();
    const filters = tenants
      .map((t) => `--filter name=api-${t.slug}`)
      .concat(['--filter name=venuz-nginx'])
      .join(' ');

    const ps = await runShell(`docker ps -a --format '{{json .}}' ${filters}`, 60000);
    const lines = ps
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const j = JSON.parse(line);
        return {
          Name: j.Names,
          Service: j.Names,
          State: j.State,
          Status: j.Status,
        };
      });

    const health = {};
    const nginxEnabled = {};
    for (const tenant of tenants) {
      nginxEnabled[tenant.slug] = await isTenantNginxEnabled(tenant.slug);

      const service = `api-${tenant.slug}`;
      if (!nginxEnabled[tenant.slug]) {
        health[tenant.slug] = { ok: false, error: 'Casa desligada (nginx offline)' };
        continue;
      }
      try {
        const out = await runShell(
          `docker exec venuz-nginx wget -qO- http://${service}:3000/health`,
          30000
        );
        health[tenant.slug] = { ok: true, body: out };
      } catch (e) {
        health[tenant.slug] = { ok: false, error: e.message };
      }
    }

    const system = await collectSystemStats(runShell);

    res.json({
      containers: lines,
      health,
      nginxEnabled,
      system,
      job: activeJob
        ? {
            id: activeJob.id,
            label: activeJob.label,
            running: activeJob.running,
            code: activeJob.code,
          }
        : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/job', (_req, res) => {
  if (!activeJob) return res.json({ job: null });
  res.json({ job: activeJob });
});

app.post('/api/stop/:tenant', async (req, res) => {
  try {
    assertTenant(req.params.tenant);
    const slug = req.params.tenant;
    const tenants = loadTenants();
    await runShell(stopTenantCommand(slug), 120000);
    const domain = tenants.find((t) => t.slug === slug)?.domain || slug;
    res.json({
      ok: true,
      message: `Casa ${slug} desligada: ${domain}, admin.${domain}, api.${domain}`,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/start/:tenant', async (req, res) => {
  try {
    assertTenant(req.params.tenant);
    const slug = req.params.tenant;
    const tenants = loadTenants();
    await runShell(startTenantCommand(slug), 120000);
    const domain = tenants.find((t) => t.slug === slug)?.domain || slug;
    res.json({ ok: true, message: `Casa ${slug} no ar: ${domain}, admin.${domain}, api.${domain}` });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/restart/:tenant', async (req, res) => {
  try {
    assertTenant(req.params.tenant);
    const slug = req.params.tenant;
    await runShell(restartTenantCommand(slug), 120000);
    res.json({ ok: true, message: `Casa ${slug} reiniciada (API + nginx da casa)` });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/delete/:tenant', (req, res) => {
  try {
    if (activeJob?.running) {
      res.status(409).json({ error: 'Aguarde a operação atual terminar.' });
      return;
    }

    const slug = req.params.tenant;
    assertTenant(slug);

    if (slug === '_shared' || slug === '_template') {
      res.status(400).json({ error: 'Slug protegido.' });
      return;
    }

    assertDeployReady('delete-tenant.sh');

    const registry = loadRegistry().filter((t) => t.slug !== slug);
    saveRegistry(registry);
    saveTenants(registry);

    const cmd = `${chmodScriptsCmd()} && ${scriptCmd('delete-tenant.sh', shellQuote(slug))}`;
    const id = startJob(`Excluir casa — ${slug}`, cmd);
    res.json({
      ok: true,
      jobId: id,
      slug,
      message: `Removendo ${slug} (container, nginx, arquivos, registry)…`,
    });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/deploy/:tenant', (req, res) => {
  try {
    assertTenant(req.params.tenant);
    const slug = req.params.tenant;
    const cmd = `${chmodScriptsCmd()} && CLEAN=1 ${scriptCmd('deploy-tenant.sh', slug)}`;
    const id = startJob(`Deploy ${slug}`, cmd);
    res.json({ ok: true, jobId: id, message: 'Deploy iniciado' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/deploy-all', (_req, res) => {
  try {
    const tenants = loadTenants();
    const deploySteps = tenants
      .map((t) => `CLEAN=1 ${scriptCmd('deploy-tenant.sh', t.slug)}`)
      .join(' && ');
    const labels = tenants.map((t) => t.slug).join(' + ');
    const cmd = `${chmodScriptsCmd()} && ${deploySteps}`;
    const id = startJob(`Deploy ${labels}`, cmd);
    res.json({ ok: true, jobId: id, message: `Deploy de ${tenants.length} casas iniciado` });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get('/api/logs/:tenant', async (req, res) => {
  try {
    assertTenant(req.params.tenant);
    const lines = Math.min(Number(req.query.lines || 80), 300);
    const slug = req.params.tenant;
    const out = await runShell(`docker logs api-${slug} --tail=${lines}`, 60000);
    res.json({ ok: true, output: out });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get('/api/logs/:tenant/live', (req, res) => {
  let slug;
  try {
    slug = req.params.tenant;
    assertTenant(slug);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
    return;
  }

  if (activeLogStream) {
    activeLogStream.kill('SIGTERM');
    activeLogStream = null;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ line: `==> Logs ao vivo: api-${slug}\n` })}\n\n`);

  const child = spawn('docker', ['logs', '-f', '--tail', '150', `api-${slug}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  activeLogStream = child;

  const sendChunk = (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (!line) continue;
      res.write(`data: ${JSON.stringify({ line: `${line}\n` })}\n\n`);
    }
  };

  child.stdout.on('data', sendChunk);
  child.stderr.on('data', sendChunk);

  const cleanup = () => {
    if (activeLogStream === child) activeLogStream = null;
    if (!child.killed) child.kill('SIGTERM');
  };

  child.on('close', () => {
    res.write(`data: ${JSON.stringify({ line: '\n==> Stream encerrado\n', done: true })}\n\n`);
    cleanup();
    res.end();
  });

  child.on('error', (err) => {
    res.write(`data: ${JSON.stringify({ line: `\nErro: ${err.message}\n`, done: true })}\n\n`);
    cleanup();
    res.end();
  });

  req.on('close', cleanup);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Ops-Panel] http://0.0.0.0:${PORT} (Deploy-Infra: ${DEPLOY_DIR})`);
});
