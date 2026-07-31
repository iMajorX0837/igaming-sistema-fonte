const express = require('express');
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { collectSystemStats } = require('./systemStats');

const ROOT = __dirname;
const REPO_ROOT = process.env.REPO_ROOT || '/opt/venuzbet';
const DEPLOY_DIR = process.env.DEPLOY_DIR || path.join(REPO_ROOT, 'deploy');
const PORT = Number(process.env.OPS_PORT || 9090);
const OPS_USER = process.env.OPS_USER || 'admin';
const OPS_PASSWORD = process.env.OPS_PASSWORD || '';

const tenants = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tenants.json'), 'utf8')
);
const tenantSlugs = new Set(tenants.map((t) => t.slug));

if (!OPS_PASSWORD || OPS_PASSWORD === 'troque-esta-senha') {
  console.warn('[ops-panel] AVISO: defina OPS_PASSWORD no arquivo .env');
}

/** @type {{ id: string, label: string, running: boolean, output: string, code: number|null, startedAt: string, endedAt?: string }} */
let activeJob = null;

/** @type {import('child_process').ChildProcess | null} */
let activeLogStream = null;

const app = express();
app.use(express.json({ limit: '32kb' }));

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Basic realm="Venuz Ops"');
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

function assertTenant(slug) {
  if (!tenantSlugs.has(slug)) {
    const err = new Error(`Tenant inválido: ${slug}`);
    err.status = 400;
    throw err;
  }
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
  res.json({ tenants });
});

app.get('/api/status', async (_req, res) => {
  try {
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
    const cmd =
      'chmod +x scripts/*.sh && CLEAN=1 ./scripts/deploy-tenant.sh stewgaming && CLEAN=1 ./scripts/deploy-tenant.sh pixnarede';
    const id = startJob('Deploy stewgaming + pixnarede', cmd);
    res.json({ ok: true, jobId: id, message: 'Deploy das duas casas iniciado' });
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
  console.log(`[ops-panel] http://0.0.0.0:${PORT} (deploy: ${DEPLOY_DIR})`);
});
