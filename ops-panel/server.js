const express = require('express');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { collectSystemStats } = require('./systemStats');

const ROOT = __dirname;
const REPO_ROOT = process.env.REPO_ROOT || '/opt/venuzbet';
const DEPLOY_DIR = process.env.DEPLOY_DIR || path.join(REPO_ROOT, 'Deploy-Infra');
const PORT = Number(process.env.OPS_PORT || 9090);
const OPS_USER = process.env.OPS_USER || 'admin';
const OPS_PASSWORD = process.env.OPS_PASSWORD || '';

const REGISTRY_PATH = path.join(DEPLOY_DIR, 'tenants.registry.json');
const TENANTS_JSON = path.join(ROOT, 'tenants.json');
const SHARED_SECRETS = path.join(DEPLOY_DIR, 'tenants/_shared/secrets.env');

function loadTenants() {
  try {
    return JSON.parse(fs.readFileSync(TENANTS_JSON, 'utf8'));
  } catch {
    return [];
  }
}

function saveTenants(list) {
  fs.writeFileSync(TENANTS_JSON, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveRegistry(list) {
  fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function assertTenant(slug) {
  if (!loadTenants().some((t) => t.slug === slug)) {
    const err = new Error(`Tenant inválido: ${slug}`);
    err.status = 400;
    throw err;
  }
}

function validateNewTenant(body) {
  const slug = String(body.slug || '')
    .trim()
    .toLowerCase();
  const domain = String(body.domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  const label = String(body.label || '').trim();
  const supabaseUrl = String(body.supabaseUrl || body.supabase_url || '').trim();
  const supabaseAnonKey = String(body.supabaseAnonKey || body.supabase_anon_key || '').trim();
  const supabaseServiceKey = String(
    body.supabaseServiceKey || body.supabase_service_key || ''
  ).trim();

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw Object.assign(new Error('Slug inválido (use a-z, 0-9, hífen)'), { status: 400 });
  }
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    throw Object.assign(new Error('Domínio inválido (ex: bandpiix.com)'), { status: 400 });
  }
  if (!label) {
    throw Object.assign(new Error('Nome da casa é obrigatório'), { status: 400 });
  }
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('supabase')) {
    throw Object.assign(new Error('SUPABASE_URL inválida'), { status: 400 });
  }
  if (supabaseAnonKey.length < 20) {
    throw Object.assign(new Error('SUPABASE_ANON_KEY inválida'), { status: 400 });
  }
  if (supabaseServiceKey.length < 20) {
    throw Object.assign(new Error('SUPABASE_SERVICE_KEY inválida'), { status: 400 });
  }

  return { slug, domain, label, supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

if (!OPS_PASSWORD || OPS_PASSWORD === 'troque-esta-senha') {
  console.warn('[Ops-Panel] AVISO: defina OPS_PASSWORD no arquivo .env');
}

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
  res.json({
    sharedSecretsReady: fs.existsSync(SHARED_SECRETS),
    registryPath: REGISTRY_PATH,
    deployDir: DEPLOY_DIR,
  });
});

app.post('/api/platform/init-secrets', (_req, res) => {
  try {
    if (activeJob?.running) {
      res.status(409).json({ error: 'Aguarde a operação atual terminar.' });
      return;
    }
    const cmd = 'chmod +x scripts/*.sh && ./scripts/init-platform-secrets.sh stewgaming';
    const id = startJob('Init secrets compartilhados', cmd);
    res.json({ ok: true, jobId: id, message: 'Copiando secrets da stewgaming...' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
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

    const data = validateNewTenant(req.body || {});
    const registry = loadRegistry();
    if (registry.some((t) => t.slug === data.slug)) {
      res.status(409).json({ error: `Casa "${data.slug}" já existe.` });
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

    const deploy = req.body?.deploy !== false;
    const cmd = `chmod +x scripts/*.sh && ./scripts/sync-tenants-registry.sh && ./scripts/nova-casa.sh ${shellQuote(data.slug)}${deploy ? ' --deploy' : ''}`;
    const id = startJob(`Nova casa — ${data.slug}`, cmd);

    res.json({
      ok: true,
      jobId: id,
      slug: data.slug,
      domain: data.domain,
      message: deploy ? 'Casa criada — deploy em andamento' : 'Casa criada — rode deploy manualmente',
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

app.post('/api/deploy/:tenant', (req, res) => {
  try {
    assertTenant(req.params.tenant);
    const slug = req.params.tenant;
    const cmd = `chmod +x scripts/*.sh && CLEAN=1 ./scripts/deploy-tenant.sh ${slug}`;
    const id = startJob(`Deploy ${slug}`, cmd);
    res.json({ ok: true, jobId: id, message: 'Deploy iniciado' });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/deploy-all', (_req, res) => {
  try {
    const tenants = loadTenants();
    const deploySteps = tenants.map((t) => `CLEAN=1 ./scripts/deploy-tenant.sh ${t.slug}`).join(' && ');
    const labels = tenants.map((t) => t.slug).join(' + ');
    const cmd = `chmod +x scripts/*.sh && ${deploySteps}`;
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
