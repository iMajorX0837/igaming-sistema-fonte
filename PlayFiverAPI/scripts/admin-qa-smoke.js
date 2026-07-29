/**
 * Smoke test automatizado — AdminPainel (RPCs + APIs)
 *
 * Uso (PowerShell):
 *   cd PlayFiverAPI
 *   $env:ADMIN_EMAIL="admin@exemplo.com"
 *   $env:ADMIN_PASSWORD="sua_senha"
 *   # Se 2FA ativo:
 *   $env:ADMIN_TOTP="123456"
 *   node scripts/admin-qa-smoke.js
 *
 * Opções:
 *   --mutations          Testes de escrita seguros (rejeitar dep/saque pendente)
 *   --deposit-approve    Inclui aprovar 1 depósito pendente (credita saldo)
 *   --base-url URL       Default: PENTEST_BASE_URL ou http://localhost:3000
 *
 * Nunca executa: aprovar saque (PIX /api/withdraw/approve)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const args = process.argv.slice(2);
const WITH_MUTATIONS = args.includes('--mutations');
const WITH_DEPOSIT_APPROVE = args.includes('--deposit-approve');
const BASE = (
  args.find((a, i) => args[i - 1] === '--base-url') ||
  process.env.PENTEST_BASE_URL ||
  process.env.PUBLIC_API_URL ||
  'http://localhost:3000'
).replace(/\/$/, '');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_TOTP = process.env.ADMIN_TOTP?.trim();

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-client-info': 'admin-panel',
};

/** Cookie jar simples — API admin usa HttpOnly cookies (H7), não Bearer no body. */
const cookieJar = new Map();

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function skip(name, detail = '') {
  results.push({ name, ok: true, skipped: true, detail });
  console.log(`⏭️  ${name}${detail ? ` — ${detail}` : ''}`);
}

function parseSetCookieHeaders(headers) {
  const raw = headers.getSetCookie?.() ?? [];
  if (raw.length === 0) {
    const single = headers.get('set-cookie');
    if (single) raw.push(single);
  }
  for (const line of raw) {
    const part = String(line).split(';')[0];
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (value === '' || part.endsWith('=')) {
      cookieJar.delete(name);
    } else {
      cookieJar.set(name, value);
    }
  }
}

function cookieHeader() {
  if (cookieJar.size === 0) return '';
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function req(method, urlPath, { headers = {}, body } = {}) {
  const h = { ...ADMIN_HEADERS, ...headers };
  const cookies = cookieHeader();
  if (cookies) h.Cookie = cookies;

  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: h,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  parseSetCookieHeaders(res.headers);

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 300) };
  }

  return { status: res.status, json, text };
}

function rpcError(json) {
  const err = json?.error;
  if (!err) return null;
  if (typeof err === 'string') return err;
  const parts = [err.code, err.message].filter(Boolean);
  return parts.join(': ') || JSON.stringify(err);
}

async function rpc(name, params = {}) {
  const r = await req('POST', `/api/supabase/rpc/${name}`, {
    body: { params },
  });
  const err = rpcError(r.json);
  return { ...r, ok: r.status === 200 && !err, err, data: r.json?.data };
}

async function loginAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente.');
  }

  cookieJar.clear();

  const signIn = await req('POST', '/api/supabase/auth/sign-in', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  if (signIn.status !== 200) {
    throw new Error(`Login falhou HTTP ${signIn.status}: ${signIn.text.slice(0, 200)}`);
  }

  const payload = signIn.json?.data;
  if (signIn.json?.error?.message) {
    throw new Error(`Login: ${signIn.json.error.message}`);
  }

  if (payload?.requires2FA) {
    if (!ADMIN_TOTP) {
      throw new Error('Conta com 2FA — defina ADMIN_TOTP com o código de 6 dígitos.');
    }
    const verify = await req('POST', '/api/supabase/auth/2fa/verify-login', {
      body: {
        challengeToken: payload.challengeToken,
        code: ADMIN_TOTP,
      },
    });
    if (verify.status !== 200 || verify.json?.error?.message) {
      throw new Error(`2FA falhou: ${verify.json?.error?.message || verify.text.slice(0, 200)}`);
    }
  }

  if (!cookieJar.has('venuz_admin_at') && !cookieJar.has('venuz_at')) {
    throw new Error('Login OK mas sem cookie de sessão (conta não é admin?)');
  }
}

async function testReadRpcs() {
  const readTests = [
    ['get_user_cargo', {}],
    ['obter_stats_dashboard_admin', { p_periodo: 'hoje' }],
    ['listar_transacoes_recentes_admin', { p_limite: 5 }],
    ['obter_stats_saques_admin', { p_periodo: 'hoje' }],
    ['obter_stats_depositos_admin', { p_periodo: 'hoje' }],
    ['listar_depositos_admin', { p_status: 'todos', p_periodo: 'todos', p_busca: null, p_pagina: 1, p_por_pagina: 5 }],
    ['listar_saques_admin', { p_status: 'pendente', p_periodo: 'todos', p_busca: null, p_pagina: 1, p_por_pagina: 5 }],
    ['obter_stats_usuarios_admin', {}],
    ['listar_usuarios_admin', { p_offset: 0, p_limit: 5 }],
    ['get_total_usuarios', {}],
    ['obter_config_plataforma', {}],
    ['listar_membros_equipe', {}],
    ['listar_logs_admin', { p_pagina: 1, p_por_pagina: 10, p_busca: null, p_categoria: null }],
    ['obter_payment_gateway_admin', {}],
    ['obter_misticpay_config_admin', {}],
    ['obter_bspay_config_admin', {}],
    ['obter_veopag_config_admin', {}],
    ['obter_aviator_config_admin', {}],
  ];

  for (const [name, params] of readTests) {
    const r = await rpc(name, params);
    if (r.ok) {
      pass(`RPC read ${name}`, `HTTP ${r.status}`);
    } else {
      fail(`RPC read ${name}`, r.err || `HTTP ${r.status}`);
    }
  }
}

async function testContextualReads() {
  const deps = await rpc('listar_depositos_admin', {
    p_status: 'pendente',
    p_periodo: 'todos',
    p_busca: null,
    p_pagina: 1,
    p_por_pagina: 1,
  });
  const pendingDeposit = deps.data?.items?.[0];

  const saques = await rpc('listar_saques_admin', {
    p_status: 'pendente',
    p_periodo: 'todos',
    p_busca: null,
    p_pagina: 1,
    p_por_pagina: 1,
  });
  const pendingSaque = saques.data?.items?.[0];

  const users = await rpc('listar_usuarios_admin', { p_offset: 0, p_limit: 1 });
  const testUser = users.data?.items?.[0];

  if (pendingDeposit?.id) {
    const d = await rpc('obter_detalhes_deposito_admin', { p_deposito_id: pendingDeposit.id });
    if (d.ok) pass('RPC obter_detalhes_deposito_admin', pendingDeposit.id.slice(0, 8));
    else fail('RPC obter_detalhes_deposito_admin', d.err);
  } else {
    skip('RPC obter_detalhes_deposito_admin', 'sem depósito pendente');
  }

  if (pendingSaque?.id) {
    const s = await rpc('obter_analise_risco_saque_admin', { p_saque_id: pendingSaque.id });
    if (s.ok) pass('RPC obter_analise_risco_saque_admin', pendingSaque.id.slice(0, 8));
    else fail('RPC obter_analise_risco_saque_admin', s.err);
  } else {
    skip('RPC obter_analise_risco_saque_admin', 'sem saque pendente');
  }

  if (testUser?.id) {
    const uid = testUser.id;
    for (const [name, params] of [
      ['obter_detalhes_usuario_admin', { p_usuario_id: uid }],
      ['listar_transacoes_usuario_admin', { p_usuario_id: uid, p_tipo: 'depositos', p_limite: 5, p_offset: 0 }],
      ['obter_indicacao_usuario_admin', { p_usuario_id: uid }],
      ['obter_rollover_usuario_admin', { p_usuario_id: uid }],
    ]) {
      const r = await rpc(name, params);
      if (r.ok) pass(`RPC ${name}`, uid.slice(0, 8));
      else fail(`RPC ${name}`, r.err);
    }
  } else {
    skip('RPCs usuário detalhes', 'sem usuários na base');
  }

  return { pendingDeposit, pendingSaque };
}

async function testSafeMutations(ctx) {
  const { pendingDeposit, pendingSaque } = ctx;

  if (pendingDeposit?.id) {
    if (WITH_DEPOSIT_APPROVE) {
      const r = await rpc('atualizar_status_deposito_admin', {
        p_deposito_id: pendingDeposit.id,
        p_status: 'aprovado',
      });
      if (r.ok && r.data?.ok !== false) pass('MUTATION aprovar depósito', pendingDeposit.id.slice(0, 8));
      else fail('MUTATION aprovar depósito', r.data?.error || r.err);
    } else {
      const r = await rpc('atualizar_status_deposito_admin', {
        p_deposito_id: pendingDeposit.id,
        p_status: 'falhou',
      });
      if (r.ok && r.data?.ok !== false) pass('MUTATION marcar depósito falhou', pendingDeposit.id.slice(0, 8));
      else fail('MUTATION marcar depósito falhou', r.data?.error || r.err);
    }
  } else {
    skip('MUTATION depósito', 'sem pendente');
  }

  if (pendingSaque?.id) {
    const r = await rpc('atualizar_status_saque_admin', {
      p_saque_id: pendingSaque.id,
      p_status: 'rejeitado',
    });
    if (r.ok && r.data?.ok !== false) pass('MUTATION rejeitar saque (sem PIX)', pendingSaque.id.slice(0, 8));
    else fail('MUTATION rejeitar saque', r.data?.error || r.err);
  } else {
    skip('MUTATION rejeitar saque', 'sem pendente');
  }

  skip('API POST /api/withdraw/approve', 'pulado de propósito (PIX real)');

  const approveViaRpc = await rpc('atualizar_status_saque_admin', {
    p_saque_id: pendingSaque?.id || '00000000-0000-0000-0000-000000000001',
    p_status: 'aprovado',
  });
  if (!pendingSaque?.id) {
    skip('RPC aprovar saque bloqueado', 'sem saque para testar');
  } else if (approveViaRpc.data?.ok === false || approveViaRpc.err) {
    pass('RPC aprovar saque bloqueado (esperado)', approveViaRpc.data?.error || approveViaRpc.err);
  } else {
    fail('RPC aprovar saque deveria ser bloqueado', JSON.stringify(approveViaRpc.data));
  }
}

async function testWebhooksApi() {
  const r = await req('GET', '/api/webhooks');
  if (r.status === 200 && r.json?.ok !== false) {
    pass('API GET /api/webhooks', `HTTP ${r.status}`);
  } else {
    fail('API GET /api/webhooks', r.json?.message || `HTTP ${r.status}`);
  }
}

async function main() {
  console.log(`\n🔍 Admin QA Smoke — ${BASE}`);
  console.log(`   mutations=${WITH_MUTATIONS} deposit-approve=${WITH_DEPOSIT_APPROVE}\n`);

  try {
    await loginAdmin();
    pass('Login admin', ADMIN_EMAIL);
  } catch (e) {
    fail('Login admin', e.message);
    printSummary();
    process.exit(1);
  }

  const cargo = await rpc('get_user_cargo', {});
  if (cargo.ok && cargo.data === 'admin') pass('Cargo admin confirmado');
  else fail('Cargo admin', cargo.data || cargo.err);

  await testReadRpcs();
  const ctx = await testContextualReads();

  if (WITH_MUTATIONS) {
    await testSafeMutations(ctx);
  } else {
    skip('MUTATIONs', 'use --mutations para testar escrita');
  }

  await testWebhooksApi();

  printSummary();
  process.exit(results.some((r) => r.ok === false) ? 1 : 0);
}

function printSummary() {
  const failed = results.filter((r) => r.ok === false);
  const passed = results.filter((r) => r.ok === true && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  console.log('\n--- Resumo ---');
  console.log(`✅ ${passed.length}  ❌ ${failed.length}  ⏭️  ${skipped.length}`);
  if (failed.length) {
    console.log('\nFalhas:');
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
