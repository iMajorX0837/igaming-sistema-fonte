const tenantsEl = document.getElementById('tenants');
const globalLog = document.getElementById('global-log');
globalLog.textContent = '';
const jobBox = document.getElementById('job-box');
const jobLabel = document.getElementById('job-label');
const jobStatus = document.getElementById('job-status');
const jobOutput = document.getElementById('job-output');

let pollTimer = null;

function log(msg) {
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`;
  globalLog.textContent = `${line}\n${globalLog.textContent}`.slice(0, 8000);
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
  const api = containers.find((c) => c.Service === `api-${slug}`);
  if (!api) return { label: 'API ausente', ok: false };
  const state = (api.State || api.Status || '').toLowerCase();
  const ok = state.includes('running');
  return { label: ok ? 'API online' : api.State || api.Status || 'offline', ok };
}

function renderTenants(tenants, status) {
  const containers = status.containers || [];
  tenantsEl.innerHTML = tenants
    .map((t) => {
      const c = containerStatus(containers, t.slug);
      const nginxOn = status.nginxEnabled?.[t.slug] !== false;
      const houseOn = c.ok && nginxOn;
      const h = status.health?.[t.slug];
      const healthOk = h?.ok;
      return `
        <article class="card" data-slug="${t.slug}">
          <div class="card-head">
            <div>
              <h3>${t.label}</h3>
              <div class="meta">${t.domain}</div>
            </div>
          </div>
          <div class="badges">
            <span class="badge ${houseOn ? 'ok' : 'err'}">${houseOn ? 'Casa no ar' : 'Casa desligada'}</span>
            <span class="badge ${c.ok ? 'ok' : 'err'}">${c.ok ? 'API online' : 'API parada'}</span>
            <span class="badge ${nginxOn ? 'ok' : 'err'}">${nginxOn ? 'Nginx ativo' : 'Nginx off'}</span>
            <span class="badge ${healthOk ? 'ok' : 'err'}">${healthOk ? 'Health OK' : 'Health falhou'}</span>
          </div>
          <div class="actions">
            <button class="btn btn-start" data-action="start" data-slug="${t.slug}" ${houseOn ? 'disabled' : ''}>Iniciar casa</button>
            <button class="btn btn-stop" data-action="stop" data-slug="${t.slug}" ${houseOn ? '' : 'disabled'}>Parar casa</button>
            <button class="btn btn-ghost" data-action="restart" data-slug="${t.slug}">Reiniciar</button>
            <button class="btn btn-warn" data-action="deploy" data-slug="${t.slug}">Deploy CLEAN</button>
            <button class="btn btn-ghost" data-action="logs" data-slug="${t.slug}">Ver logs</button>
          </div>
          <div class="links">
            <a href="http://${t.domain}" target="_blank" rel="noreferrer">Site</a>
            <a href="http://admin.${t.domain}" target="_blank" rel="noreferrer">Admin</a>
            <a href="http://api.${t.domain}/health" target="_blank" rel="noreferrer">API /health</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function showJob(job) {
  if (!job) {
    jobBox.classList.add('hidden');
    return;
  }
  jobBox.classList.remove('hidden');
  jobLabel.textContent = job.label || 'Operação';
  jobStatus.textContent = job.running ? 'Em andamento...' : `Exit ${job.code}`;
  jobStatus.className = `badge ${job.running ? '' : job.code === 0 ? 'ok' : 'err'}`;
  jobOutput.textContent = job.output || '';
  jobOutput.scrollTop = jobOutput.scrollHeight;
}

async function refresh() {
  const { tenants } = await api('/api/tenants');
  const status = await api('/api/status');
  renderTenants(tenants, status);
  if (status.job) showJob(await api('/api/job').then((r) => r.job));
  else showJob(null);
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

tenantsEl.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('button[data-action]');
  if (!btn || btn.disabled) return;

  const { action, slug } = btn.dataset;
  btn.disabled = true;

  try {
    if (action === 'stop') {
      log(`Desligando casa ${slug} (API + domínios)...`);
      await api(`/api/stop/${slug}`, { method: 'POST' });
      log(`${slug}: casa inteira offline (site, admin, api).`);
      await refresh();
    }

    if (action === 'start') {
      log(`Ligando casa ${slug}...`);
      await api(`/api/start/${slug}`, { method: 'POST' });
      log(`${slug}: casa inteira no ar.`);
      await refresh();
    }

    if (action === 'restart') {
      log(`Reiniciando ${slug}...`);
      await api(`/api/restart/${slug}`, { method: 'POST' });
      log(`${slug}: reiniciada.`);
      await refresh();
    }

    if (action === 'deploy') {
      log(`Deploy CLEAN ${slug} iniciado...`);
      await api(`/api/deploy/${slug}`, { method: 'POST' });
      showJob({ label: `Deploy ${slug}`, running: true, output: 'Iniciando...\n', code: null });
      pollJob();
    }

    if (action === 'logs') {
      log(`Carregando logs ${slug}...`);
      const res = await api(`/api/logs/${slug}?lines=100`);
      showJob({ label: `Logs ${slug}`, running: false, output: res.output, code: 0 });
    }
  } catch (e) {
    log(`Erro: ${e.message}`);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('btn-refresh').addEventListener('click', () => {
  refresh().catch((e) => log(e.message));
});

document.getElementById('btn-deploy-all').addEventListener('click', async () => {
  try {
    log('Deploy das 2 casas iniciado...');
    await api('/api/deploy-all', { method: 'POST' });
    showJob({ label: 'Deploy stewgaming + pixnarede', running: true, output: 'Iniciando...\n', code: null });
    pollJob();
  } catch (e) {
    log(`Erro: ${e.message}`);
  }
});

refresh()
  .then(() => log('Painel carregado.'))
  .catch((e) => log(`Falha ao carregar: ${e.message}`));

setInterval(() => {
  refresh().catch(() => {});
}, 30000);
