const tenantsEl = document.getElementById('tenants');
const sidebarTenantsEl = document.getElementById('sidebar-tenants');
const statsEl = document.getElementById('stats');
const vpsStatsEl = document.getElementById('vps-stats');
const globalLog = document.getElementById('global-log');
const jobBox = document.getElementById('job-box');
const jobLabel = document.getElementById('job-label');
const jobStatus = document.getElementById('job-status');
const jobOutput = document.getElementById('job-output');
const btnStopLive = document.getElementById('btn-stop-live');
const pageTitle = document.getElementById('page-title');
const lastUpdateEl = document.getElementById('last-update');
const toastRoot = document.getElementById('toast-root');
const modalRoot = document.getElementById('modal-root');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalIcon = document.getElementById('modal-icon');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

globalLog.textContent = '';

let pollTimer = null;
let liveLogsActive = false;
/** @type {AbortController | null} */
let liveLogsAbort = null;
let liveLogsOutput = '';
/** @type {((value: boolean) => void) | null} */
let modalResolve = null;
/** @type {string | null} */
let activeTenantSlug = null;
/** @type {string | null} */
let pendingTenantSlug = null;
/** @type {{ slug: string; label: string; domain: string }[]} */
let knownTenants = [];

const ICONS = {
  start: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  stop: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>',
  restart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  deploy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
  logs: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  live: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>',
  link: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
  alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
};


function notify(title, message = '', type = 'info', duration = 4500) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${ICONS[type === 'success' ? 'check' : type === 'error' ? 'x' : type === 'warn' ? 'alert' : 'info']}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button type="button" class="toast-close" aria-label="Fechar">${ICONS.x}</button>
  `;

  const remove = () => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector('.toast-close')?.addEventListener('click', remove);
  toastRoot.appendChild(toast);
  if (duration > 0) setTimeout(remove, duration);
}

function closeModal(result) {
  modalRoot.classList.add('hidden');
  modalRoot.classList.remove('is-open');
  document.body.style.overflow = '';
  if (modalResolve) {
    modalResolve(result);
    modalResolve = null;
  }
}

function confirmAction({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'warn' }) {
  return new Promise((resolve) => {
    modalResolve = resolve;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalCancel.textContent = cancelText;
    modalConfirm.textContent = confirmText;

    modalIcon.className = `modal-icon ${variant === 'danger' ? 'danger' : variant === 'info' ? 'info' : 'warn'}`;
    modalIcon.innerHTML = variant === 'danger' ? ICONS.stop : variant === 'info' ? ICONS.info : ICONS.alert;

    modalConfirm.className = variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

    modalRoot.classList.remove('hidden');
    modalRoot.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modalConfirm.focus();
  });
}

modalCancel.addEventListener('click', () => closeModal(false));
modalConfirm.addEventListener('click', () => closeModal(true));
modalRoot.querySelector('.modal-backdrop')?.addEventListener('click', () => closeModal(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalRoot.classList.contains('is-open')) closeModal(false);
});

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('is-loading', loading);
  btn.disabled = loading;
}

function log(msg) {
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
  globalLog.textContent = `${line}\n${globalLog.textContent}`.slice(0, 12000);
}

function parseRoute(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/' || path === '/overview') {
    return { view: 'overview', slug: null, valid: true };
  }
  if (path === '/console') {
    return { view: 'console', slug: null, valid: true };
  }
  if (path === '/nova-casa') {
    return { view: 'nova-casa', slug: null, valid: true };
  }

  const match = path.match(/^\/casas\/([a-z0-9_-]+)$/i);
  if (match) {
    return { view: 'overview', slug: match[1].toLowerCase(), valid: true };
  }

  return { view: 'overview', slug: null, valid: false };
}

function routePath(view, slug = null) {
  if (view === 'console') return '/console';
  if (view === 'nova-casa') return '/nova-casa';
  if (slug) return `/casas/${slug}`;
  return '/';
}

function updatePageMeta(route) {
  if (route.view === 'console') {
    pageTitle.textContent = 'Console';
    document.title = 'Console — Stew Gaming';
    return;
  }

  if (route.view === 'nova-casa') {
    pageTitle.textContent = 'Nova casa';
    document.title = 'Nova casa — Stew Gaming';
    loadPlatformStatus();
    return;
  }

  if (route.slug) {
    const tenant = knownTenants.find((t) => t.slug === route.slug);
    const label = tenant?.label || route.slug;
    pageTitle.textContent = label;
    document.title = `${label} — Stew Gaming`;
    return;
  }

  pageTitle.textContent = 'Visão geral';
  document.title = 'Visão geral — Stew Gaming';
}

function applyView(view) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((el) => {
    el.classList.toggle('active', el.id === `view-${view}`);
  });
}

function highlightTenantCard(slug) {
  document.querySelectorAll('.tenant-card').forEach((card) => {
    card.classList.toggle('is-focused', card.dataset.slug === slug);
  });

  document.querySelectorAll('.sidebar-tenant').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.slug === slug);
  });
}

function scrollToTenantCard(slug) {
  const card = document.querySelector(`.tenant-card[data-slug="${slug}"]`);
  if (!card) return false;

  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.style.outline = '2px solid var(--blue)';
  setTimeout(() => {
    card.style.outline = '';
  }, 1600);
  highlightTenantCard(slug);
  return true;
}

function applyRoute(route, { updateUrl = false, replace = false } = {}) {
  if (!route.valid) {
    notify('Rota inválida', 'Redirecionando para a visão geral', 'warn', 3000);
    navigate(routePath('overview'), { replace: true });
    return;
  }

  if (route.slug && knownTenants.length && !knownTenants.some((t) => t.slug === route.slug)) {
    notify('Casa não encontrada', route.slug, 'error');
    navigate(routePath('overview'), { replace: true });
    return;
  }

  activeTenantSlug = route.slug;
  pendingTenantSlug = route.slug;
  applyView(route.view);
  updatePageMeta(route);

  if (route.slug) {
    if (!scrollToTenantCard(route.slug)) {
      pendingTenantSlug = route.slug;
    }
  } else {
    highlightTenantCard(null);
    pendingTenantSlug = null;
  }

  if (updateUrl) {
    const path = routePath(route.view, route.slug);
    if (location.pathname !== path) {
      if (replace) history.replaceState({ route }, '', path);
      else history.pushState({ route }, '', path);
    }
  }
}

function navigate(path, { replace = false } = {}) {
  applyRoute(parseRoute(path), { updateUrl: true, replace });
}

function setView(view, slug = null) {
  applyRoute({ view, slug, valid: true }, { updateUrl: true });
}

function scrollToTenant(slug) {
  navigate(routePath('overview', slug));
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

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

function meterClass(percent) {
  if (percent >= 90) return 'crit';
  if (percent >= 75) return 'warn';
  return 'ok';
}

function renderVpsStats(system) {
  if (!system?.available) {
    vpsStatsEl.innerHTML = `
      <div class="vps-head">
        <div>
          <h2>Servidor (VPS)</h2>
          <p>Métricas do host indisponíveis</p>
        </div>
      </div>
      <div class="vps-unavailable">${system?.message || 'Recrie o container ops com volumes montados.'}</div>
    `;
    return;
  }

  const memPct = system.memory?.percent ?? 0;
  const diskPct = system.disk?.percent ?? 0;
  const cpuPct = system.cpu?.usagePercent;
  const cpuDisplay = cpuPct == null ? '…' : `${cpuPct}%`;

  vpsStatsEl.innerHTML = `
    <div class="vps-head">
      <div>
        <h2>Servidor (VPS)</h2>
        <p>CPU, memória e disco do host</p>
      </div>
      <div class="vps-host">
        <strong>${system.hostname || 'vps'}</strong><br>
        Uptime: ${system.uptimeHuman || '—'}
      </div>
    </div>
    <div class="vps-grid">
      <article class="vps-metric">
        <div class="label">Processador</div>
        <div class="value-row">
          <span class="value">${cpuDisplay}</span>
          <span class="sub">${system.cpu?.cores || '?'} núcleos</span>
        </div>
        <div class="sub" title="${system.cpu?.model || ''}">${(system.cpu?.model || 'CPU').slice(0, 42)}${(system.cpu?.model || '').length > 42 ? '…' : ''}</div>
        ${cpuPct != null ? `<div class="meter" style="margin-top:10px"><div class="meter-fill ${meterClass(cpuPct)}" style="width:${cpuPct}%"></div></div>` : ''}
        <div class="sub" style="margin-top:8px">Load: ${system.cpu?.load1?.toFixed(2) ?? '—'} / ${system.cpu?.load5?.toFixed(2) ?? '—'} / ${system.cpu?.load15?.toFixed(2) ?? '—'}</div>
      </article>
      <article class="vps-metric">
        <div class="label">Memória RAM</div>
        <div class="value-row">
          <span class="value">${memPct}%</span>
          <span class="sub">${formatBytes(system.memory?.usedBytes)} / ${formatBytes(system.memory?.totalBytes)}</span>
        </div>
        <div class="meter"><div class="meter-fill ${meterClass(memPct)}" style="width:${memPct}%"></div></div>
        <div class="sub" style="margin-top:8px">Livre: ${formatBytes(system.memory?.availableBytes)}</div>
      </article>
      <article class="vps-metric">
        <div class="label">Disco</div>
        <div class="value-row">
          <span class="value">${diskPct}%</span>
          <span class="sub">${system.disk ? `${formatBytes(system.disk.usedBytes)} / ${formatBytes(system.disk.totalBytes)}` : '—'}</span>
        </div>
        ${system.disk ? `<div class="meter"><div class="meter-fill ${meterClass(diskPct)}" style="width:${diskPct}%"></div></div>` : '<div class="sub">Não foi possível ler o disco</div>'}
        <div class="sub" style="margin-top:8px">${system.disk?.mount ? `Montagem: ${system.disk.mount}` : ''}</div>
      </article>
    </div>
  `;
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
      const isActive = activeTenantSlug === t.slug;
      return `
        <a href="/casas/${t.slug}" class="sidebar-tenant ${isActive ? 'is-active' : ''}" data-slug="${t.slug}">
          <div>
            <div class="sidebar-tenant-name">${t.label}</div>
            <div class="sidebar-tenant-domain">${t.domain}</div>
          </div>
          <span class="status-dot ${houseOn ? 'on' : 'off'}" title="${houseOn ? 'Online' : 'Offline'}"></span>
        </a>
      `;
    })
    .join('');
}

function renderTenants(tenants, status) {
  tenantsEl.innerHTML = tenants
    .map((t) => {
      const { api, nginxOn, houseOn, healthOk } = tenantState(t, status);
      return `
        <article class="tenant-card ${houseOn ? 'is-online' : ''}" data-slug="${t.slug}">
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
                  <button class="btn btn-start" data-action="start" data-slug="${t.slug}" ${houseOn ? 'disabled' : ''}>
                    <span class="btn-icon">${ICONS.start}</span>Iniciar
                  </button>
                  <button class="btn btn-stop" data-action="stop" data-slug="${t.slug}" ${houseOn ? '' : 'disabled'}>
                    <span class="btn-icon">${ICONS.stop}</span>Parar
                  </button>
                  <button class="btn btn-ghost" data-action="restart" data-slug="${t.slug}">
                    <span class="btn-icon">${ICONS.restart}</span>Reiniciar
                  </button>
                </div>
              </div>
              <div class="action-group">
                <label>Deploy & logs</label>
                <div class="action-row">
                  <button class="btn btn-warn" data-action="deploy" data-slug="${t.slug}">
                    <span class="btn-icon">${ICONS.deploy}</span>Deploy CLEAN
                  </button>
                  <button class="btn btn-ghost" data-action="logs" data-slug="${t.slug}">
                    <span class="btn-icon">${ICONS.logs}</span>Logs
                  </button>
                  <button class="btn btn-ghost" data-action="logs-live" data-slug="${t.slug}">
                    <span class="btn-icon">${ICONS.live}</span>Ao vivo
                  </button>
                </div>
              </div>
            </div>

            <div class="links-row">
              <a class="link-chip" href="http://${t.domain}" target="_blank" rel="noreferrer">${ICONS.link} Site</a>
              <a class="link-chip" href="http://admin.${t.domain}" target="_blank" rel="noreferrer">${ICONS.link} Admin</a>
              <a class="link-chip" href="http://api.${t.domain}/health" target="_blank" rel="noreferrer">${ICONS.link} API</a>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  renderSidebarTenants(tenants, status);
  renderVpsStats(status.system);
  renderStats(tenants, status);

  if (pendingTenantSlug) {
    scrollToTenantCard(pendingTenantSlug);
  }
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
      notify('Erro nos logs', e.message, 'error');
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
  knownTenants = tenants;
  const status = await api('/api/status');
  renderTenants(tenants, status);
  lastUpdateEl.textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR')}`;

  const currentRoute = parseRoute(location.pathname);
  if (currentRoute.slug) updatePageMeta(currentRoute);

  if (!liveLogsActive) {
    if (status.job) showJob(await api('/api/job').then((r) => r.job));
    else if (jobBox.classList.contains('hidden') === false && !liveLogsOutput) {
      /* keep console visible */
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
      const ok = job.code === 0;
      log(`${job.label} finalizado (exit ${job.code})`);
      notify(
        ok ? 'Operação concluída' : 'Operação falhou',
        `${job.label} — exit ${job.code}`,
        ok ? 'success' : 'error'
      );
      await refresh();
    }
  } catch (e) {
    log(`Erro polling: ${e.message}`);
    notify('Erro', e.message, 'error');
  }
}

async function needsConfirmation(action, slug) {
  if (action === 'stop') {
    return confirmAction({
      title: 'Parar casa?',
      message: `A casa "${slug}" ficará offline (API + nginx). Os visitantes não conseguirão acessar o site.`,
      confirmText: 'Sim, parar',
      variant: 'danger',
    });
  }

  if (action === 'restart') {
    return confirmAction({
      title: 'Reiniciar API?',
      message: `O container da API "${slug}" será reiniciado. Pode haver alguns segundos de indisponibilidade.`,
      confirmText: 'Reiniciar',
      variant: 'warn',
    });
  }

  if (action === 'deploy') {
    return confirmAction({
      title: 'Deploy CLEAN?',
      message: `Isso vai rebuildar a imagem e redeployar "${slug}". Pode levar alguns minutos e causar downtime.`,
      confirmText: 'Iniciar deploy',
      variant: 'warn',
    });
  }

  return true;
}

async function runTenantAction(action, slug) {
  if (action === 'stop') {
    log(`Desligando casa ${slug}...`);
    notify('Parando casa', slug, 'info', 3000);
    await api(`/api/stop/${slug}`, { method: 'POST' });
    log(`${slug}: casa offline.`);
    notify('Casa desligada', `${slug} está offline`, 'success');
    await refresh();
  }

  if (action === 'start') {
    log(`Ligando casa ${slug}...`);
    notify('Iniciando casa', slug, 'info', 3000);
    await api(`/api/start/${slug}`, { method: 'POST' });
    log(`${slug}: casa no ar.`);
    notify('Casa no ar', `${slug} está online`, 'success');
    await refresh();
  }

  if (action === 'restart') {
    log(`Reiniciando ${slug}...`);
    notify('Reiniciando', slug, 'info', 3000);
    await api(`/api/restart/${slug}`, { method: 'POST' });
    log(`${slug}: reiniciada.`);
    notify('Reiniciada', `${slug} foi reiniciada`, 'success');
    await refresh();
  }

  if (action === 'deploy') {
    log(`Deploy CLEAN ${slug}...`);
    notify('Deploy iniciado', slug, 'info', 3000);
    await api(`/api/deploy/${slug}`, { method: 'POST' });
    showJob({ label: `Deploy — ${slug}`, running: true, output: 'Iniciando...\n', code: null });
    pollJob();
  }

  if (action === 'logs') {
    stopLiveLogs();
    log(`Logs ${slug}...`);
    const res = await api(`/api/logs/${slug}?lines=120`);
    showJob({ label: `Logs — ${slug}`, running: false, output: res.output, code: 0 });
    notify('Logs carregados', slug, 'info', 2500);
  }

  if (action === 'logs-live') {
    log(`Logs ao vivo ${slug}...`);
    notify('Conectando', `Logs ao vivo — ${slug}`, 'info', 2500);
    startLiveLogs(slug);
  }
}

tenantsEl.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('button[data-action]');
  if (!btn || btn.disabled) return;

  const { action, slug } = btn.dataset;

  const confirmed = await needsConfirmation(action, slug);
  if (!confirmed) return;

  setButtonLoading(btn, true);
  try {
    await runTenantAction(action, slug);
  } catch (e) {
    log(`Erro: ${e.message}`);
    notify('Erro na operação', e.message, 'error');
  } finally {
    setButtonLoading(btn, false);
    await refresh();
  }
});

sidebarTenantsEl.addEventListener('click', (ev) => {
  const link = ev.target.closest('.sidebar-tenant');
  if (!link) return;
  ev.preventDefault();
  navigate(link.getAttribute('href') || routePath('overview', link.dataset.slug));
});

document.querySelector('.sidebar-nav')?.addEventListener('click', (ev) => {
  const link = ev.target.closest('a.nav-item');
  if (!link) return;
  ev.preventDefault();
  navigate(link.getAttribute('href') || '/');
});

document.querySelector('.brand-link')?.addEventListener('click', (ev) => {
  ev.preventDefault();
  navigate('/');
});

window.addEventListener('popstate', () => {
  applyRoute(parseRoute(location.pathname));
});

document.getElementById('btn-refresh').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget;
  setButtonLoading(btn, true);
  try {
    await refresh();
    notify('Status atualizado', 'Dados da VPS e das casas foram recarregados', 'success', 2500);
  } catch (e) {
    log(e.message);
    notify('Erro ao atualizar', e.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
});

document.getElementById('btn-clear-log').addEventListener('click', () => {
  globalLog.textContent = '';
  notify('Log limpo', '', 'info', 2000);
});

btnStopLive.addEventListener('click', () => {
  stopLiveLogs();
  log('Stream de logs parado.');
  notify('Stream parado', 'Logs ao vivo encerrados', 'info', 2500);
  showJob({
    label: 'Logs ao vivo',
    running: false,
    live: false,
    output: `${liveLogsOutput}\n==> Parado pelo usuário\n`,
    code: 0,
  });
});

document.getElementById('btn-deploy-all').addEventListener('click', async (ev) => {
  const btn = ev.currentTarget;
  const confirmed = await confirmAction({
    title: 'Deploy de todas as casas?',
    message: `Isso vai rebuildar e redeployar ${knownTenants.map((t) => t.slug).join(', ')}. Pode levar vários minutos.`,
    confirmText: 'Iniciar deploy',
    variant: 'warn',
  });
  if (!confirmed) return;

  setButtonLoading(btn, true);
  try {
    const slugs = knownTenants.map((t) => t.slug).join(' + ');
    log(`Deploy de todas as casas (${slugs})...`);
    notify('Deploy iniciado', slugs, 'info', 3000);
    await api('/api/deploy-all', { method: 'POST' });
    showJob({
      label: `Deploy — ${slugs}`,
      running: true,
      output: 'Iniciando...\n',
      code: null,
    });
    pollJob();
  } catch (e) {
    log(`Erro: ${e.message}`);
    notify('Erro no deploy', e.message, 'error');
  } finally {
    setButtonLoading(btn, false);
  }
});

async function loadPlatformStatus() {
  const banner = document.getElementById('platform-banner');
  const submitBtn = document.getElementById('btn-nova-casa-submit');
  if (!banner) return;

  try {
    const platform = await api('/api/platform');
    if (platform.sharedSecretsReady) {
      banner.classList.add('hidden');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    banner.classList.remove('hidden');
    banner.className = 'platform-banner warn';
    banner.innerHTML = `
      <div>
        <strong>Plataforma não preparada</strong>
        <p>Secrets compartilhados (PlayFivers, pagamentos…) ainda não foram copiados. Faça isso uma vez:</p>
      </div>
      <button type="button" class="btn btn-warn btn-sm" id="btn-init-secrets">Preparar plataforma</button>
    `;

    document.getElementById('btn-init-secrets')?.addEventListener('click', async () => {
      try {
        await api('/api/platform/init-secrets', { method: 'POST' });
        notify('Preparando plataforma', 'Copiando secrets da stewgaming…', 'info');
        setView('console');
        showJob({ label: 'Init secrets', running: true, output: 'Iniciando...\n', code: null });
        pollJob();
      } catch (e) {
        notify('Erro', e.message, 'error');
      }
    });

    if (submitBtn) submitBtn.disabled = true;
  } catch {
    banner.classList.remove('hidden');
    banner.className = 'platform-banner err';
    banner.textContent = 'Não foi possível verificar o status da plataforma.';
  }
}

const ncSlug = document.getElementById('nc-slug');
const ncSlugPreview = document.getElementById('nc-slug-preview');
const ncDomain = document.getElementById('nc-domain');
const ncLabel = document.getElementById('nc-label');

ncSlug?.addEventListener('input', () => {
  const slug = ncSlug.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  ncSlug.value = slug;
  if (ncSlugPreview) ncSlugPreview.textContent = slug || '...';
});

ncDomain?.addEventListener('blur', () => {
  if (!ncLabel?.value && ncDomain?.value) {
    const base = ncDomain.value.split('.')[0];
    ncLabel.value = base.charAt(0).toUpperCase() + base.slice(1);
  }
});

document.getElementById('form-nova-casa')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = document.getElementById('btn-nova-casa-submit');
  const form = ev.currentTarget;
  const data = Object.fromEntries(new FormData(form));

  const confirmed = await confirmAction({
    title: 'Criar nova casa?',
    message: `Vai registrar e subir ${data.slug} (${data.domain}). Certifique-se que o Supabase já tem o schema SQL aplicado.`,
    confirmText: 'Criar casa',
    variant: 'warn',
  });
  if (!confirmed) return;

  setButtonLoading(btn, true);
  try {
    const payload = {
      slug: data.slug,
      domain: data.domain,
      label: data.label,
      supabaseUrl: data.supabaseUrl,
      supabaseAnonKey: data.supabaseAnonKey,
      supabaseServiceKey: data.supabaseServiceKey,
      deploy: document.getElementById('nc-deploy')?.checked !== false,
    };

    const res = await api('/api/tenants/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    log(`Nova casa ${res.slug} — ${res.message}`);
    notify('Casa criada', `${res.slug} (${res.domain})`, 'success');
    form.reset();
    if (ncSlugPreview) ncSlugPreview.textContent = '...';

    setView('console');
    showJob({
      label: `Nova casa — ${res.slug}`,
      running: true,
      output: 'Iniciando deploy...\n',
      code: null,
    });
    pollJob();
  } catch (e) {
    notify('Erro ao criar casa', e.message, 'error');
    log(`Erro nova casa: ${e.message}`);
  } finally {
    setButtonLoading(btn, false);
  }
});

refresh()
  .then(() => {
    applyRoute(parseRoute(location.pathname));
    log('Painel pronto.');
    notify('Painel carregado', 'Monitoramento ativo', 'success', 3000);
  })
  .catch((e) => {
    log(`Falha: ${e.message}`);
    notify('Falha ao carregar', e.message, 'error');
  });

setInterval(() => {
  refresh().catch(() => {});
}, 30000);
