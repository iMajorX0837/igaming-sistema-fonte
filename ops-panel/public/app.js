const tenantsEl = document.getElementById('tenants');
const sidebarTenantsEl = document.getElementById('sidebar-tenants');
const statsEl = document.getElementById('stats');
const globalLog = document.getElementById('global-log');
const jobBox = document.getElementById('job-box');
const jobLabel = document.getElementById('job-label');
const jobStatus = document.getElementById('job-status');
const jobOutput = document.getElementById('job-output');
const btnStopLive = document.getElementById('btn-stop-live');
const pageTitle = document.getElementById('page-title');
const lastUpdateEl = document.getElementById('last-update');

globalLog.textContent = '';

let pollTimer = null;
let liveLogsActive = false;
/** @type {AbortController | null} */
let liveLogsAbort = null;
let liveLogsOutput = '';

function log(msg) {
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
  globalLog.textContent = `${line}\n${globalLog.textContent}`.slice(0, 12000);
}

function setView(view) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((el) => {
    el.classList.toggle('active', el.id === `view-${view}`);
  });
  pageTitle.textContent = view === 'console' ? 'Console' : 'Visão geral';
}

function scrollToTenant(slug) {
  setView('overview');
  const card = document.querySelector(`.tenant-card[data-slug="${slug}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.outline = '2px solid var(--blue)';
    setTimeout(() => {
      card.style.outline = '';
    }, 1600);
  }
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro ${res.status}`);
  }
  return data;
}

function containerStatus(containers, slug) {
  const row = containers.find((c) => c.Service === `api-${slug}`);
  if (!row) return { label: 'API ausente', ok: false };
  const state = (row.State || row.Status || '').toLowerCase();
  const ok = state.includes('running');
  return { label: ok ? 'API online' : row.State || row.Status || 'offline', ok };
}

function tenantState(t, status) {
  const containers = status.containers || [];
  const api = containerStatus(containers, t.slug);
  const nginxOn = status.nginxEnabled?.[t.slug] !== false;
  const houseOn = api.ok && nginxOn;
  const healthOk = status.health?.[t.slug]?.ok;
  return { api, nginxOn, houseOn, healthOk };
}

function renderStats(tenants, status) {
  let online = 0;
  for (const t of tenants) {
    if (tenantState(t, status).houseOn) online += 1;
  }

  const jobRunning = status.job?.running ? 1 : 0;

  statsEl.innerHTML = `
    <article class="stat-card accent-blue">
      <div class="label">Casas no ar</div>
      <div class="value">${online}/${tenants.length}</div>
      <div class="hint">API + nginx ativos</div>
    </article>
    <article class="stat-card accent-green">
      <div class="label">Containers</div>
      <div class="value">${(status.containers || []).length}</div>
      <div class="hint">APIs + nginx monitorados</div>
    </article>
    <article class="stat-card accent-amber">
      <div class="label">Operação</div>
      <div class="value">${jobRunning ? 'Ativa' : 'Ociosa'}</div>
      <div class="hint">${status.job?.label || 'Nenhum deploy rodando'}</div>
    </article>
  `;
}

function renderSidebarTenants(tenants, status) {
  sidebarTenantsEl.innerHTML = tenants
    .map((t) => {
      const { houseOn } = tenantState(t, status);
      return `
        <button type="button" class="sidebar-tenant" data-slug="${t.slug}">
          <div>
            <div class="sidebar-tenant-name">${t.label}</div>
            <div class="sidebar-tenant-domain">${t.domain}</div>
          </div>
          <span class="status-dot ${houseOn ? 'on' : 'off'}" title="${houseOn ? 'Online' : 'Offline'}"></span>
        </button>
      `;
    })
    .join('');
}

function renderTenants(tenants, status) {
  const containers = status.containers || [];
  tenantsEl.innerHTML = tenants
    .map((t) => {
      const { api, nginxOn, houseOn, healthOk } = tenantState(t, status);
      return `
        <article class="tenant-card" data-slug="${t.slug}">
          <div class="tenant-card-head">
            <div>
              <h3>${t.label}</h3>
              <div class="tenant-domain">${t.domain}</div>
            </div>
            <span class="badge ${houseOn ? 'ok' : 'err'}">${houseOn ? 'Casa no ar' : 'Desligada'}</span>
          </div>
          <div class="tenant-card-body">
            <div class="status-grid">
              <div class="status-pill ${api.ok ? 'ok' : 'err'}">● ${api.ok ? 'API online' : 'API parada'}</div>
              <div class="status-pill ${nginxOn ? 'ok' : 'err'}">● ${nginxOn ? 'Nginx ativo' : 'Nginx off'}</div>
              <div class="status-pill ${healthOk ? 'ok' : 'err'}">● ${healthOk ? 'Health OK' : 'Health falhou'}</div>
              <div class="status-pill ${houseOn ? 'ok' : 'err'}">● ${houseOn ? 'Operacional' : 'Indisponível'}</div>
            </div>

            <div class="action-groups">
              <div class="action-group">
                <label>Power</label>
                <div class="action-row">
                  <button class="btn btn-start" data-action="start" data-slug="${t.slug}" ${houseOn ? 'disabled' : ''}>Iniciar</button>
                  <button class="btn btn-stop" data-action="stop" data-slug="${t.slug}" ${houseOn ? '' : 'disabled'}>Parar</button>
                  <button class="btn btn-ghost" data-action="restart" data-slug="${t.slug}">Reiniciar</button>
                </div>
              </div>
              <div class="action-group">
                <label>Deploy & logs</label>
                <div class="action-row">
                  <button class="btn btn-warn" data-action="deploy" data-slug="${t.slug}">Deploy CLEAN</button>
                  <button class="btn btn-ghost" data-action="logs" data-slug="${t.slug}">Logs</button>
                  <button class="btn btn-ghost" data-action="logs-live" data-slug="${t.slug}">Ao vivo</button>
                </div>
              </div>
            </div>

            <div class="links-row">
              <a class="link-chip" href="http://${t.domain}" target="_blank" rel="noreferrer">Site</a>
              <a class="link-chip" href="http://admin.${t.domain}" target="_blank" rel="noreferrer">Admin</a>
              <a class="link-chip" href="http://api.${t.domain}/health" target="_blank" rel="noreferrer">API</a>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  renderSidebarTenants(tenants, status);
  renderStats(tenants, status);
}

function showJob(job) {
  if (!job) {
    if (liveLogsActive) return;
    jobBox.classList.add('hidden');
    btnStopLive.classList.add('hidden');
    return;
  }

  setView('console');
  jobBox.classList.remove('hidden');

  jobLabel.textContent = job.label || 'Operação';
  if (job.live) {
    jobStatus.textContent = 'Ao vivo';
    jobStatus.className = 'badge ok';
    btnStopLive.classList.remove('hidden');
  } else {
    btnStopLive.classList.add('hidden');
    jobStatus.textContent = job.running ? 'Em andamento...' : `Exit ${job.code}`;
    jobStatus.className = `badge ${job.running ? '' : job.code === 0 ? 'ok' : 'err'}`;
  }
  jobOutput.textContent = job.output || '';
  jobOutput.scrollTop = jobOutput.scrollHeight;
}

function stopLiveLogs() {
  if (liveLogsAbort) {
    liveLogsAbort.abort();
    liveLogsAbort = null;
  }
  liveLogsActive = false;
  btnStopLive.classList.add('hidden');
}

async function startLiveLogs(slug) {
  stopLiveLogs();
  liveLogsActive = true;
  liveLogsOutput = '';
  liveLogsAbort = new AbortController();

  showJob({
    label: `Logs ao vivo — ${slug}`,
    running: true,
    live: true,
    output: 'Conectando...\n',
    code: null,
  });

  try {
    const res = await fetch(`/api/logs/${slug}/live`, {
      credentials: 'same-origin',
      signal: liveLogsAbort.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erro ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const line = event.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6));
        liveLogsOutput += payload.line || '';
        if (liveLogsOutput.length > 200000) {
          liveLogsOutput = liveLogsOutput.slice(-150000);
        }
        showJob({
          label: `Logs ao vivo — ${slug}`,
          running: !payload.done,
          live: !payload.done,
          output: liveLogsOutput,
          code: payload.done ? 0 : null,
        });
        if (payload.done) liveLogsActive = false;
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      log(`Erro logs ao vivo: ${e.message}`);
      showJob({
        label: `Logs ao vivo — ${slug}`,
        running: false,
        live: false,
        output: `${liveLogsOutput}\nErro: ${e.message}`,
        code: 1,
      });
    }
  } finally {
    liveLogsActive = false;
    liveLogsAbort = null;
    btnStopLive.classList.add('hidden');
  }
}

async function refresh() {
  const { tenants } = await api('/api/tenants');
  const status = await api('/api/status');
  lastSnapshot = { tenants, status };
  renderTenants(tenants, status);
  lastUpdateEl.textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR')}`;

  if (!liveLogsActive) {
    if (status.job) showJob(await api('/api/job').then((r) => r.job));
    else if (jobBox.classList.contains('hidden') === false && !liveLogsOutput) {
      // keep console visible if user opened it
    } else {
      showJob(null);
    }
  }
}

async function pollJob() {
  try {
    const { job } = await api('/api/job');
    showJob(job);
    if (job?.running) {
      pollTimer = setTimeout(pollJob, 2000);
    } else if (job) {
      log(`${job.label} finalizado (exit ${job.code})`);
      await refresh();
    }
  } catch (e) {
    log(`Erro polling: ${e.message}`);
  }
}

async function runTenantAction(action, slug) {
  if (action === 'stop') {
    log(`Desligando casa ${slug}...`);
    await api(`/api/stop/${slug}`, { method: 'POST' });
    log(`${slug}: casa offline.`);
    await refresh();
  }

  if (action === 'start') {
    log(`Ligando casa ${slug}...`);
    await api(`/api/start/${slug}`, { method: 'POST' });
    log(`${slug}: casa no ar.`);
    await refresh();
  }

  if (action === 'restart') {
    log(`Reiniciando ${slug}...`);
    await api(`/api/restart/${slug}`, { method: 'POST' });
    log(`${slug}: reiniciada.`);
    await refresh();
  }

  if (action === 'deploy') {
    log(`Deploy CLEAN ${slug}...`);
    await api(`/api/deploy/${slug}`, { method: 'POST' });
    showJob({ label: `Deploy — ${slug}`, running: true, output: 'Iniciando...\n', code: null });
    pollJob();
  }

  if (action === 'logs') {
    stopLiveLogs();
    log(`Logs ${slug}...`);
    const res = await api(`/api/logs/${slug}?lines=120`);
    showJob({ label: `Logs — ${slug}`, running: false, output: res.output, code: 0 });
  }

  if (action === 'logs-live') {
    log(`Logs ao vivo ${slug}...`);
    startLiveLogs(slug);
  }
}

tenantsEl.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('button[data-action]');
  if (!btn || btn.disabled) return;

  const { action, slug } = btn.dataset;
  btn.disabled = true;
  try {
    await runTenantAction(action, slug);
  } catch (e) {
    log(`Erro: ${e.message}`);
  } finally {
    btn.disabled = false;
  }
});

sidebarTenantsEl.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.sidebar-tenant');
  if (!btn) return;
  scrollToTenant(btn.dataset.slug);
});

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

document.getElementById('btn-refresh').addEventListener('click', () => {
  refresh().catch((e) => log(e.message));
});

document.getElementById('btn-clear-log').addEventListener('click', () => {
  globalLog.textContent = '';
});

btnStopLive.addEventListener('click', () => {
  stopLiveLogs();
  log('Stream de logs parado.');
  showJob({
    label: 'Logs ao vivo',
    running: false,
    live: false,
    output: `${liveLogsOutput}\n==> Parado pelo usuário\n`,
    code: 0,
  });
});

document.getElementById('btn-deploy-all').addEventListener('click', async () => {
  try {
    log('Deploy das 2 casas...');
    await api('/api/deploy-all', { method: 'POST' });
    showJob({
      label: 'Deploy — stewgaming + pixnarede',
      running: true,
      output: 'Iniciando...\n',
      code: null,
    });
    pollJob();
  } catch (e) {
    log(`Erro: ${e.message}`);
  }
});

refresh()
  .then(() => log('Painel pronto.'))
  .catch((e) => log(`Falha: ${e.message}`));

setInterval(() => {
  refresh().catch(() => {});
}, 30000);
