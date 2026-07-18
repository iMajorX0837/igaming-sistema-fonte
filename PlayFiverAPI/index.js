import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import https from 'https';
import { URL } from 'url';
import {
  buildAviatorLaunchUrl,
  isAviatorGameCode,
  mountAviatorProxy,
  mountAviatorRoutes,
  startAviatorPythonServer,
} from './aviator/routes.js';
import { createDepositRouter } from './deposit.js';
import { createWithdrawRouter } from './withdraw.js';
import { createSupabaseProxyRouter } from './routes/supabaseProxy.js';
import { createCpfHubRouter } from './routes/cpfHub.js';
import { parseCpfHubApiKeys } from './lib/cpfHubKeys.js';
import { createWebhooksAdminRouter } from './routes/webhooksAdmin.js';
import { dispatchWebhookEvent } from './lib/webhookDispatcher.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/** Aviator próprio (clone Spribe) — ativo por padrão. Desligue com AVIATOR_GAME_ENABLED=false */
const AVIATOR_GAME_ENABLED = process.env.AVIATOR_GAME_ENABLED !== 'false';
/** API legada /api/aviator (rodadas Supabase). Desligada por padrão. */
const AVIATOR_API_ENABLED = process.env.AVIATOR_API_ENABLED === 'true';
/** Em dev local: não chama api.playfivers.com no game_launch (evita IP bloqueado). */
const GAME_LAUNCH_MOCK = process.env.GAME_LAUNCH_MOCK === 'true';
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const PLAYFIVERS_UPSTREAM = (process.env.PLAYFIVERS_UPSTREAM_URL || 'https://api.playfivers.com').replace(/\/$/, '');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://psoyhrnjnalroihnswoo.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzb3locm5qbmFscm9paG5zd29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjY4MjUsImV4cCI6MjA5OTQ0MjgyNX0.qZPWZ4f2RgVyim4BHiEn31bMSSrUQqzMVyeT1cd2bPA';

if (!supabaseServiceKey) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY não configurada. Usando anon key (pode ter limitações).');
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1aXB2YXVmYmx2amZlc250anB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODg1OTEsImV4cCI6MjA4MDI2NDU5MX0.p2Zev8oCbVIPM_6wR_aBNm-15vhNcHdKQuguniwkP_8'
);

// Middleware CORS configurado
app.use((req, res, next) => {
  // Permitir todas as origens durante desenvolvimento (incluindo localhost)
  const origin = req.headers.origin;
  
  // Permitir todas as origens (incluindo localhost:5173)
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 horas
  
  // Responder imediatamente para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Proxy Aviator → Python (antes do body parser, para SSE e POST com stream)
mountAviatorProxy(app, { enabled: AVIATOR_GAME_ENABLED });

// Middleware para parsing JSON
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const PLAYFIVERS_FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

const PLAYFIVER_AGENT_TOKEN_DEFAULT = '8898269e-650f-42af-bea0-d93981c545b0';
const PLAYFIVER_SECRET_KEY_DEFAULT = '8b83d392-6dae-423c-bb76-af873254a0e7';

/** game_code aceito pelo endpoint free_bonus (pode diferir do catálogo de launch) */
const FREE_BONUS_GAME_CODE_BY_SLUG = {
  'gates-of-olympus': 'vs20olympx',
  'starlight-princess': 'vs20starlight',
  'sweet-bonanza': 'vs20fruitswx',
  'sugar-rush': 'vs20sugarrushx',
  'starlight-princess-1000': 'vs20starlightx',
  'gates-of-olympus-1000': 'vs20olympx',
  'sweet-bonanza-1000': 'vs20fruitswx',
  'sugar-rush-1000': 'vs20sugarrushx',
};

function getPlayFiverCredentials(source = {}) {
  return {
    token:
      source.agent_token ||
      source.agentToken ||
      process.env.PLAYFIVER_AGENT_TOKEN ||
      PLAYFIVER_AGENT_TOKEN_DEFAULT,
    secret:
      source.secret_key ||
      source.secretKey ||
      process.env.PLAYFIVER_SECRET_KEY ||
      PLAYFIVER_SECRET_KEY_DEFAULT,
  };
}

function fetchGetWithJsonBody(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const payload = typeof body === 'string' ? body : JSON.stringify(body);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawText = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => rawText,
        });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function fetchPlayFiversFreeBonusList(token, secret) {
  const url = `${PLAYFIVERS_UPSTREAM}/api/v2/free_bonus`;

  return fetchGetWithJsonBody(
    url,
    {
      agent_token: token,
      secret_key: secret,
    },
    PLAYFIVERS_FETCH_HEADERS
  );
}

/** Busca nome do jogo na PlayFivers — só para persistência; não bloquear webhook. */
async function resolvePlayFiversGameName(providerCode, gameCode) {
  const fallback = `Jogo ${gameCode}`;
  if (!providerCode || !gameCode) return fallback;

  const providersResponse = await fetch(`${PLAYFIVERS_UPSTREAM}/api/v2/providers`, {
    headers: PLAYFIVERS_FETCH_HEADERS,
  });
  if (!providersResponse.ok) return fallback;

  const providersData = await providersResponse.json();
  if (providersData.status !== 1 || !providersData.data) return fallback;

  const foundProvider = providersData.data.find(
    (p) =>
      p.code === providerCode ||
      p.name === providerCode ||
      p.name.toLowerCase().includes(String(providerCode).toLowerCase())
  );
  if (!foundProvider) return fallback;

  const gamesResponse = await fetch(
    `${PLAYFIVERS_UPSTREAM}/api/v2/games?provider=${foundProvider.id}`,
    { headers: PLAYFIVERS_FETCH_HEADERS }
  );
  if (!gamesResponse.ok) return fallback;

  const gamesData = await gamesResponse.json();
  if (gamesData.status !== 1 || !gamesData.data) return fallback;

  const gameCodeStr = String(gameCode).trim();
  const gameCodeNum = parseInt(gameCode, 10);
  const foundGame = gamesData.data.find((g) => {
    if (String(g.game_code) === gameCodeStr || String(g.code) === gameCodeStr) return true;
    if (g.game_code === gameCodeNum || g.code === gameCodeNum) return true;
    if (String(g.id) === gameCodeStr || g.id === gameCodeNum) return true;
    return false;
  });

  return foundGame?.name || fallback;
}

/** Persiste aposta no Supabase após responder à PlayFivers (evita timeout no game_callback). */
async function persistGameTransaction({
  usuarioId,
  txnId,
  bet,
  win,
  providerCode,
  gameCode,
  processedAt,
  gameName,
}) {
  let nomeJogo = gameName || `Jogo ${gameCode}`;
  if (!gameName) {
    try {
      nomeJogo = await resolvePlayFiversGameName(providerCode, gameCode);
    } catch (error) {
      console.warn('⚠️  Erro ao buscar nome do jogo (background):', error);
    }
  }

  const transactionData = {
    usuario_id: usuarioId,
    txn_id: txnId,
    tipo: win > 0 ? 'Ganhou' : 'Perdeu',
    jogo: nomeJogo,
    valor: bet,
    retorno: win > 0 ? win : 0,
    status: 'Finalizado',
    com_bonus: 'Não',
    // Horário do servidor (igual Aviator) — created_at da PlayFivers costuma vir 1 dia atrasado
    data: processedAt,
  };

  const { data: savedTransaction, error: insertError } = await supabase
    .from('transacoes_jogos')
    .insert(transactionData)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Erro ao salvar transação (background):', insertError);
    return;
  }

  console.log('💾 Transação salva no banco:', savedTransaction?.id, 'data:', savedTransaction?.data);
}

function safeJsonStringify(value, maxLen = 12000) {
  try {
    const text = JSON.stringify(value, null, 2);
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}\n... [truncado ${text.length - maxLen} chars]`;
  } catch (error) {
    return `[json serialize error: ${error.message}]`;
  }
}

function getGameCallbackNestedKeys(body) {
  if (!body || typeof body !== 'object') return {};
  return Object.fromEntries(
    Object.entries(body)
      .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value))
      .map(([key, value]) => [key, Object.keys(value)])
  );
}

function logGameCallback(level, title, details = {}) {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🎯';
  const lines = [
    '',
    `${prefix} [game_callback] ${title}`,
    `   rota: ${details.route || '-'}`,
    `   horário: ${new Date().toISOString()}`,
  ];

  if (details.gameType) lines.push(`   game_type: ${details.gameType}`);
  if (details.source) lines.push(`   payload_source: ${details.source}`);
  if (details.userCode) lines.push(`   user_code: ${details.userCode}`);
  if (details.txnId) lines.push(`   txn_id: ${details.txnId}`);
  if (details.gameCode) lines.push(`   game_code: ${details.gameCode}`);
  if (details.msg) lines.push(`   msg: ${details.msg}`);
  if (details.status) lines.push(`   http_status: ${details.status}`);
  if (details.payloadKeys?.length) lines.push(`   body_keys: ${details.payloadKeys.join(', ')}`);
  if (details.nestedKeys && Object.keys(details.nestedKeys).length) {
    lines.push(`   nested_keys: ${JSON.stringify(details.nestedKeys)}`);
  }
  if (details.error) {
    lines.push(`   erro: ${details.error.message || String(details.error)}`);
    if (details.error.stack) lines.push(details.error.stack);
  }
  if (details.extra) lines.push(`   extra: ${safeJsonStringify(details.extra, 4000)}`);
  if (details.body) {
    lines.push('   payload:');
    lines.push(safeJsonStringify(details.body));
  }

  if (level === 'error') {
    console.error(lines.join('\n'));
  } else if (level === 'warn') {
    console.warn(lines.join('\n'));
  } else {
    console.log(lines.join('\n'));
  }
}

function mapPlayFiverGamePayload(data) {
  if (!data || typeof data !== 'object') return null;

  const txnId =
    data.txn_id ??
    data.txnId ??
    data.transaction_id ??
    data.transactionId ??
    data.id ??
    null;

  return {
    txnId: txnId ? String(txnId) : null,
    bet: parseFloat(data.bet ?? data.stake ?? data.amount ?? 0) || 0,
    win: parseFloat(data.win ?? data.payout ?? data.prize ?? 0) || 0,
    userBeforeBalance:
      parseFloat(data.user_before_balance ?? data.before_balance ?? NaN) || 0,
    userAfterBalance: parseFloat(data.user_after_balance ?? data.after_balance ?? NaN),
    providerCode: data.provider_code ?? data.provider ?? null,
    gameCode: data.game_code ?? data.game ?? null,
    roundType: data.type ?? null,
    roundId: data.round_id ?? data.roundId ?? null,
    txnType: data.txn_type ?? data.txnType ?? null,
    createdAt: data.created_at ?? data.createdAt ?? null,
  };
}

function extractGameCallbackPayload(transaction) {
  const gameType = String(transaction?.game_type || '').trim().toLowerCase();
  const candidates = [];

  // Doc PlayFivers: objeto dinâmico vem do game_type (sport, slot, live...)
  if (gameType && transaction?.[gameType] && typeof transaction[gameType] === 'object') {
    candidates.push({ source: gameType, data: transaction[gameType] });
  }

  // Fallback documentado: muitos payloads ainda enviam os detalhes em "slot"
  if (transaction?.slot && typeof transaction.slot === 'object') {
    candidates.push({ source: 'slot', data: transaction.slot });
  }

  for (const key of ['sport', 'sports', 'live', 'original']) {
    if (key !== gameType && transaction?.[key] && typeof transaction[key] === 'object') {
      candidates.push({ source: key, data: transaction[key] });
    }
  }

  for (const candidate of candidates) {
    const mapped = mapPlayFiverGamePayload(candidate.data);
    if (mapped?.txnId) {
      return {
        source: candidate.source,
        gameType: gameType || candidate.source,
        ...mapped,
      };
    }
  }

  const flat = mapPlayFiverGamePayload(transaction);
  if (flat?.txnId) {
    return {
      source: 'root',
      gameType: gameType || 'unknown',
      ...flat,
    };
  }

  return null;
}

function respondGameCallbackError(res, status, msg, context = {}) {
  logGameCallback('error', 'Erro no processamento de aposta', {
    ...context,
    msg,
    status,
  });
  const balance = context.balance !== undefined ? context.balance : 0;
  return res.status(status).json({ msg, balance });
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function resolveCallbackBalance(currentBalance, bet, win, userAfterBalance) {
  if (Number.isFinite(userAfterBalance)) {
    return roundMoney(userAfterBalance);
  }
  return roundMoney(currentBalance + win - bet);
}

async function findUsuarioByEmail(userCode) {
  const trimmedEmail = String(userCode || '').trim();
  let userError = null;

  let { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, saldo, email')
    .eq('email', trimmedEmail)
    .maybeSingle();

  userError = error;

  if (!usuario && (!error || error.code === 'PGRST116')) {
    const { data: usuarioIlike, error: errorIlike } = await supabase
      .from('usuarios')
      .select('id, saldo, email')
      .ilike('email', trimmedEmail)
      .maybeSingle();

    if (!errorIlike && usuarioIlike) {
      usuario = usuarioIlike;
      userError = null;
    }
  }

  if (!usuario) {
    const { data: usuarioRpc, error: rpcError } = await supabase.rpc('get_user_by_email', {
      user_email: trimmedEmail,
    });

    if (!rpcError && usuarioRpc && usuarioRpc.length > 0) {
      usuario = usuarioRpc[0];
      userError = null;
    }
  }

  return { usuario, userError, trimmedEmail };
}

function resolvePersistedGameName(gameCode, payloadSource) {
  const normalizedCode = String(gameCode || '').trim().toLowerCase();
  if (normalizedCode === 'sport' || payloadSource === 'sport' || payloadSource === 'sports') {
    return 'Esporte';
  }
  return null;
}

function createSlug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getProviderSlug(providerName) {
  const providerMap = {
    'PG Soft': 'pgsoft',
    Pgsoft: 'pgsoft',
    'Pragmatic Play': 'pragmatic',
    Pragmatic: 'pragmatic',
    'Pragmatic Live': 'pragmaticlive',
    NetEnt: 'netent',
    'Evolution Gaming': 'evolution',
    'Red Tiger': 'redtiger',
    Playson: 'playson',
    Habanero: 'habanero',
    Spribe: 'spribe',
    Evoplay: 'evoplay',
    BGaming: 'bgaming',
    Ezugi: 'ezugi',
    'C Games': 'cgames',
  };

  return providerMap[providerName] || createSlug(providerName);
}

const PLAYFIVERS_LIVE_WALLET = 'Carteira Oficial (Live)';

function isLiveProviderName(name) {
  const lower = String(name || '').trim().toLowerCase();
  return (
    lower.includes('evolution') ||
    (lower.includes('pragmatic') && lower.includes('live')) ||
    lower.includes('ezugi')
  );
}

function isSportGameLaunch(gameCode) {
  return String(gameCode || '').trim().toLowerCase() === 'sport';
}

async function shouldLaunchWithGameOriginal(gameCode, provider, requestedOriginal) {
  if (requestedOriginal === true) return true;
  if (isSportGameLaunch(gameCode)) return true;
  if (provider && isLiveProviderName(provider)) return true;

  if (!gameCode) return false;

  const providersResponse = await fetch(`${PLAYFIVERS_UPSTREAM}/api/v2/providers`, {
    headers: PLAYFIVERS_FETCH_HEADERS,
  });

  if (!providersResponse.ok) return false;

  const providersData = await providersResponse.json();
  if (providersData.status !== 1 || !Array.isArray(providersData.data)) return false;

  const liveProviders = providersData.data.filter(
    (prov) => prov.status === 1 && prov.wallet?.name === PLAYFIVERS_LIVE_WALLET
  );

  if (liveProviders.length === 0) return false;

  let providersToSearch = liveProviders;
  if (provider) {
    const providerId = parseInt(provider, 10);
    const byId = !Number.isNaN(providerId)
      ? liveProviders.find((prov) => prov.id === providerId)
      : null;
    const bySlug =
      byId ||
      liveProviders.find((prov) => getProviderSlug(prov.name) === provider) ||
      null;
    if (bySlug) providersToSearch = [bySlug];
  }

  const normalizedCode = String(gameCode).toLowerCase();
  for (const prov of providersToSearch) {
    const gamesResponse = await fetch(`${PLAYFIVERS_UPSTREAM}/api/v2/games?provider=${prov.id}`, {
      headers: PLAYFIVERS_FETCH_HEADERS,
    });

    if (!gamesResponse.ok) continue;

    const gamesData = await gamesResponse.json();
    if (gamesData.status !== 1 || !Array.isArray(gamesData.data)) continue;

    const foundGame = gamesData.data.find(
      (game) =>
        game.status &&
        String(game.game_code || '').toLowerCase() === normalizedCode
    );

    if (foundGame) return true;
  }

  return false;
}

async function resolveGameCodeFromSlug(jogoSlug, providerSlug, jogoNome) {
  if (!jogoSlug && !jogoNome) return null;

  const normalizedSlug = jogoSlug ? createSlug(jogoSlug) : '';
  const mappedCode = FREE_BONUS_GAME_CODE_BY_SLUG[normalizedSlug];
  if (mappedCode) {
    return mappedCode;
  }

  const providersResponse = await fetch(`${PLAYFIVERS_UPSTREAM}/api/v2/providers`, {
    headers: PLAYFIVERS_FETCH_HEADERS,
  });

  if (!providersResponse.ok) return null;

  const providersData = await providersResponse.json();
  if (providersData.status !== 1 || !Array.isArray(providersData.data)) return null;

  const enabledProviders = providersData.data.filter(
    (prov) =>
      prov.status === 1 &&
      (prov.wallet?.name === 'Carteira PlayFiver (Slots)' ||
        prov.wallet?.name === 'Carteira Oficial (Live)')
  );

  let foundProvider = null;
  if (providerSlug) {
    const providerId = parseInt(providerSlug, 10);
    if (!Number.isNaN(providerId)) {
      foundProvider = enabledProviders.find((prov) => prov.id === providerId) || null;
    }
    if (!foundProvider) {
      foundProvider =
        enabledProviders.find((prov) => getProviderSlug(prov.name) === providerSlug) || null;
    }
  }

  const providersToSearch = foundProvider ? [foundProvider] : enabledProviders;
  const normalizedName = jogoNome ? createSlug(jogoNome) : '';

  for (const prov of providersToSearch) {
    const gamesResponse = await fetch(`${PLAYFIVERS_UPSTREAM}/api/v2/games?provider=${prov.id}`, {
      headers: PLAYFIVERS_FETCH_HEADERS,
    });

    if (!gamesResponse.ok) continue;

    const gamesData = await gamesResponse.json();
    if (gamesData.status !== 1 || !Array.isArray(gamesData.data)) continue;

    const matches = gamesData.data.filter((game) => {
      if (!game.status) return false;
      const gameCode = String(game.game_code || '').toLowerCase();
      const gameNameSlug = createSlug(game.name);
      if (jogoSlug && (gameCode === String(jogoSlug).toLowerCase() || gameNameSlug === normalizedSlug)) {
        return true;
      }
      if (jogoNome && (gameNameSlug === normalizedName || game.name === jogoNome)) {
        return true;
      }
      return false;
    });

    const withFreeBonus = matches.find((game) => game.rounds_free === true);
    const foundGame = withFreeBonus || matches[0];

    if (foundGame?.game_code) {
      if (!foundGame.rounds_free) {
        const xVariant = gamesData.data.find(
          (game) =>
            game.status &&
            game.rounds_free === true &&
            String(game.game_code).toLowerCase() === `${String(foundGame.game_code).toLowerCase()}x`
        );
        if (xVariant?.game_code) {
          return String(xVariant.game_code);
        }
      }

      return String(foundGame.game_code);
    }
  }

  return null;
}

async function grantPlayFiversFreeBonus({ token, secret, user_code, game_code, rounds }) {
  const roundsNumber = Number(rounds);
  if (!token || !secret || !user_code || !game_code || !Number.isFinite(roundsNumber) || roundsNumber <= 0) {
    return {
      ok: false,
      status: 400,
      data: {
        status: false,
        msg: 'Campos obrigatórios faltando ou inválidos: user_code, game_code, rounds',
      },
    };
  }

  if (GAME_LAUNCH_MOCK) {
    return {
      ok: true,
      status: 200,
      data: {
        status: true,
        msg: 'Rodadas grátis concedidas em modo teste (GAME_LAUNCH_MOCK=true)',
        user_code,
        game_code: String(game_code),
        rounds: roundsNumber,
      },
    };
  }

  const playFiverResponse = await fetch(`${PLAYFIVERS_UPSTREAM}/api/v2/free_bonus`, {
    method: 'POST',
    headers: PLAYFIVERS_FETCH_HEADERS,
    body: JSON.stringify({
      agent_token: token,
      secret_key: secret,
      user_code,
      game_code: String(game_code),
      rounds: roundsNumber,
    }),
  });

  const rawText = await playFiverResponse.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      status: 502,
      data: {
        status: false,
        msg: 'Resposta inválida da API PlayFivers',
      },
    };
  }

  const success = playFiverResponse.ok && data?.status !== false && data?.status !== 0;
  return {
    ok: success,
    status: playFiverResponse.status,
    data,
  };
}

async function proxyPlayFiversJson(req, res, upstreamPath) {
  try {
    const query = new URLSearchParams(req.query).toString();
    const url = `${PLAYFIVERS_UPSTREAM}/api/v2${upstreamPath}${query ? `?${query}` : ''}`;
    const upstream = await fetch(url, { headers: PLAYFIVERS_FETCH_HEADERS });
    const rawText = await upstream.text();

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    try {
      res.json(JSON.parse(rawText));
    } catch {
      res.send(rawText);
    }
  } catch (error) {
    console.error(`❌ Erro ao fazer proxy PlayFivers (${upstreamPath}):`, error);
    res.status(502).json({
      status: 0,
      msg: 'Erro ao consultar catálogo PlayFivers',
      data: [],
    });
  }
}

// Aviator próprio: static, wallet bridge, ícones
mountAviatorRoutes(app, { supabase, enabled: AVIATOR_GAME_ENABLED });

// Depósitos PIX (MisticPay) — credenciais ficam no servidor
app.use(
  '/api/deposit',
  createDepositRouter({ supabase, supabaseUrl, supabaseAnonKey, dispatchWebhookEvent })
);

// Saques PIX (MisticPay) — aprovação admin com pagamento real
app.use(
  '/api/withdraw',
  createWithdrawRouter({
    supabase,
    supabaseUrl,
    supabaseAnonKey,
    publicApiUrl: PUBLIC_API_URL,
    dispatchWebhookEvent,
  })
);

// Proxy Supabase — frontends não acessam o banco diretamente
app.use(
  '/api/supabase',
  createSupabaseProxyRouter({
    supabase,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    dispatchWebhookEvent,
  })
);

// CPF Hub — chaves ficam no servidor
const cpfHubApiKeys = parseCpfHubApiKeys(process.env.CPFHUB_API_KEY);
app.use('/api/cpfhub', createCpfHubRouter({ apiKeys: cpfHubApiKeys }));

app.use(
  '/api/webhooks',
  createWebhooksAdminRouter({ supabase, supabaseUrl, supabaseAnonKey })
);

if (!AVIATOR_API_ENABLED) {
  app.use('/api/aviator', (req, res) => {
    res.status(503).json({
      error: 'Aviator API desabilitada',
      disabled: true,
    });
  });
}

// Middleware opcional para validação de webhook (descomente e configure se necessário)
// const validateWebhook = (req, res, next) => {
//   const signature = req.headers['x-playfiver-signature'];
//   const secret = process.env.PLAYFIVER_SECRET_KEY;
//   
//   if (!secret) {
//     return next(); // Se não houver secret configurado, pula validação
//   }
//   
//   // Implementar validação de assinatura conforme documentação da Play Fiver
//   // const expectedSignature = crypto.createHmac('sha256', secret)
//   //   .update(JSON.stringify(req.body))
//   //   .digest('hex');
//   // 
//   // if (signature !== expectedSignature) {
//   //   return res.status(401).json({ error: 'Invalid signature' });
//   // }
//   
//   next();
// };

/**
 * Webhook PlayFivers — consulta de saldo (type: BALANCE)
 */
async function handleBalanceWebhook(req, res) {
  try {
    const { type, user_code } = req.body;

    if (!type || !user_code) {
      return res.status(400).json({
        msg: 'Campos obrigatórios faltando: type, user_code',
        balance: 0,
      });
    }

    if (String(type).trim().toUpperCase() !== 'BALANCE') {
      return res.status(400).json({
        msg: 'UNSUPPORTED_WEBHOOK_TYPE',
        balance: 0,
      });
    }

    const { usuario } = await findUsuarioByEmail(user_code);

    if (!usuario) {
      console.error(`❌ Usuário não encontrado (BALANCE): ${user_code}`);
      return res.status(404).json({
        msg: 'INVALID_USER',
        balance: 0,
      });
    }

    const balance = roundMoney(usuario.saldo);
    console.log(`✅ Saldo BALANCE: ${balance} para ${usuario.email}`);

    return res.status(200).json({
      msg: '',
      balance,
    });
  } catch (error) {
    console.error('❌ Erro ao processar consulta de saldo:', error);
    return res.status(500).json({
      msg: 'ERROR_INTERNAL',
      balance: 0,
    });
  }
}

function isBalanceWebhook(body) {
  return String(body?.type || '').trim().toUpperCase() === 'BALANCE';
}

function isTransactionWebhook(body) {
  const type = String(body?.type || '').trim().toUpperCase();
  if (type === 'WINBET') return true;
  if (body?.game_type) return true;
  if (body?.slot || body?.sport || body?.sports || body?.live) return true;
  return false;
}

/**
 * Endpoint único da PlayFivers — saldo (BALANCE) e apostas (WinBet) no mesmo callback.
 * Configure no painel apenas uma URL, ex.: https://api.seudominio.com/webhook
 */
async function handlePlayFiverWebhook(req, res) {
  const body = req.body;
  console.log(
    `📥 PlayFiver webhook [${req.method} ${req.path}]:`,
    JSON.stringify(
      {
        type: body?.type,
        user_code: body?.user_code,
        game_type: body?.game_type,
      },
      null,
      2
    )
  );

  if (isBalanceWebhook(body)) {
    return handleBalanceWebhook(req, res);
  }

  if (isTransactionWebhook(body)) {
    return handleGameCallback(req, res);
  }

  logGameCallback('error', 'Tipo de webhook desconhecido', {
    route: req.path,
    body,
    payloadKeys: body ? Object.keys(body) : [],
  });

  return res.status(400).json({
    msg: 'UNSUPPORTED_WEBHOOK_TYPE',
    balance: 0,
  });
}

/**
 * Webhook / game_callback — transações da Play Fiver (slots, live, esportes, etc.)
 * POST /webhook/transaction | /game_callback | /webhook/game_callback
 */
async function handleGameCallback(req, res) {
  const route = req.path;
  const transaction = req.body;
  const baseContext = {
    route,
    body: transaction,
    payloadKeys: transaction ? Object.keys(transaction) : [],
    nestedKeys: getGameCallbackNestedKeys(transaction),
    gameType: transaction?.game_type,
    userCode: transaction?.user_code,
  };

  logGameCallback('info', 'Callback recebido', baseContext);

  try {
    if (!transaction) {
      return respondGameCallbackError(res, 400, 'Dados da transação não fornecidos', baseContext);
    }

    const { type, user_code, game_type, game_original } = transaction;

    if (!type || !user_code) {
      return respondGameCallbackError(
        res,
        400,
        'Campos obrigatórios faltando: type, user_code',
        {
          ...baseContext,
          extra: { type, user_code, game_type, game_original },
        }
      );
    }

    const extracted = extractGameCallbackPayload(transaction);

    if (!extracted) {
      const { usuario: previewUser } = await findUsuarioByEmail(user_code);
      const previewBalance = previewUser ? roundMoney(previewUser.saldo) : 0;

      return respondGameCallbackError(
        res,
        400,
        `UNSUPPORTED_GAME_TYPE:${game_type || 'unknown'}`,
        {
          ...baseContext,
          balance: previewBalance,
          extra: {
            type,
            game_type,
            game_original,
            nested_keys: getGameCallbackNestedKeys(transaction),
            hint: 'Esperado objeto dinâmico em transaction[game_type] ou transaction.slot',
          },
        }
      );
    }

    const {
      source,
      gameType: resolvedGameType,
      txnId,
      bet,
      win,
      userBeforeBalance,
      userAfterBalance,
      providerCode,
      gameCode,
      createdAt,
    } = extracted;

    logGameCallback('info', 'Payload interpretado', {
      ...baseContext,
      source,
      gameType: resolvedGameType,
      txnId,
      gameCode,
      extra: {
        type,
        bet,
        win,
        user_before_balance: userBeforeBalance,
        user_after_balance: userAfterBalance,
        provider_code: providerCode,
        game_original,
      },
    });

    if (!txnId) {
      return respondGameCallbackError(res, 400, 'txn_id não encontrado nos dados do jogo', {
        ...baseContext,
        source,
        gameType: resolvedGameType,
        extra: extracted,
      });
    }

    const { data: existingTransaction } = await supabase
      .from('transacoes_jogos')
      .select('id')
      .eq('txn_id', txnId)
      .maybeSingle();

    if (existingTransaction) {
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('saldo')
        .eq('email', user_code.trim())
        .maybeSingle();

      const balance = usuarioExistente ? parseFloat(usuarioExistente.saldo) || 0 : 0;

      logGameCallback('warn', 'Transação duplicada — retornando saldo atual', {
        ...baseContext,
        txnId,
        extra: { balance },
      });

      return res.status(200).json({
        msg: '',
        balance,
      });
    }

    const { usuario, userError, trimmedEmail } = await findUsuarioByEmail(user_code);

    if (!usuario) {
      const { data: usuariosSample, error: sampleError } = await supabase
        .from('usuarios')
        .select('email')
        .limit(10);

      return respondGameCallbackError(res, 404, 'INVALID_USER', {
        ...baseContext,
        txnId,
        balance: 0,
        extra: {
          email_buscado: trimmedEmail,
          supabase_error: userError,
          service_key_configurada: !!supabaseServiceKey,
          emails_exemplo: sampleError ? null : usuariosSample?.map((item) => item.email),
        },
      });
    }

    const currentBalance = roundMoney(usuario.saldo);
    const debitAmount = roundMoney(Math.max(0, bet - win));

    if (debitAmount > 0 && currentBalance + 1e-6 < debitAmount) {
      return respondGameCallbackError(res, 400, 'INSUFFICIENT_USER_FUNDS', {
        ...baseContext,
        txnId,
        gameCode,
        balance: currentBalance,
        extra: {
          bet,
          win,
          debitAmount,
          saldo_atual: currentBalance,
          game_type: resolvedGameType,
        },
      });
    }

    const newBalance = resolveCallbackBalance(
      currentBalance,
      bet,
      win,
      userAfterBalance
    );

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ saldo: newBalance })
      .eq('id', usuario.id);

    if (updateError) {
      return respondGameCallbackError(res, 500, 'ERROR_INTERNAL', {
        ...baseContext,
        txnId,
        gameCode,
        balance: currentBalance,
        error: updateError,
        extra: {
          usuario_id: usuario.id,
          saldo_anterior: currentBalance,
          saldo_novo: newBalance,
        },
      });
    }

    logGameCallback('info', 'Aposta processada com sucesso', {
      ...baseContext,
      source,
      gameType: resolvedGameType,
      txnId,
      gameCode,
      extra: {
        type,
        bet,
        win,
        saldo_anterior: currentBalance,
        saldo_novo: newBalance,
        usuario: usuario.email,
        playfivers_created_at: createdAt ?? null,
      },
    });

    const processedAt = new Date().toISOString();
    const persistedGameName = resolvePersistedGameName(gameCode, source);

    res.status(200).json({
      msg: '',
      balance: newBalance,
    });

    void persistGameTransaction({
      usuarioId: usuario.id,
      txnId,
      bet,
      win,
      providerCode,
      gameCode,
      processedAt,
      gameName: persistedGameName,
    }).catch((error) => {
      logGameCallback('error', 'Erro ao persistir transação (background)', {
        ...baseContext,
        txnId,
        gameCode,
        error,
      });
    });
  } catch (error) {
    return respondGameCallbackError(res, 500, 'ERROR_INTERNAL', {
      ...baseContext,
      error,
    });
  }
}

const PLAYFIVER_WEBHOOK_PATHS = [
  '/webhook',
  '/api/webhook',
  '/api',
  '/webhook/transaction',
  '/game_callback',
  '/webhook/game_callback',
];

for (const webhookPath of PLAYFIVER_WEBHOOK_PATHS) {
  app.post(webhookPath, handlePlayFiverWebhook);
}

/**
 * Página de preview para testes locais (iframe do game_launch em modo mock).
 * GET /dev/game?code=...&user=...
 */
app.get('/dev/game', (req, res) => {
  const gameCode = String(req.query.code || 'jogo');
  const userCode = String(req.query.user || 'teste');
  const balance = String(req.query.balance || '0');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Modo teste — ${gameCode}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, #121319 0%, #1a1030 100%);
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
    }
    .card {
      max-width: 420px;
      width: 100%;
      background: rgba(24, 25, 35, 0.95);
      border: 1px solid rgba(123, 63, 242, 0.35);
      border-radius: 16px;
      padding: 28px 24px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
    }
    .badge {
      display: inline-block;
      margin-bottom: 16px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(123, 63, 242, 0.2);
      color: #c4b5fd;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #cbd5e1; font-size: 14px; line-height: 1.5; margin-bottom: 6px; }
    .meta { margin-top: 18px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Modo teste local</div>
    <h1>${gameCode}</h1>
    <p>Preview de jogo para desenvolvimento no localhost.</p>
    <p>Usuário: <strong>${userCode}</strong></p>
    <p>Saldo enviado: <strong>R$ ${balance}</strong></p>
    <p class="meta">Desative GAME_LAUNCH_MOCK no PlayFiverAPI para usar a API real da PlayFivers.</p>
  </div>
</body>
</html>`);
});

/**
 * Proxy de catálogo — provedores
 * GET /api/v2/providers
 */
app.get('/api/v2/providers', (req, res) => {
  void proxyPlayFiversJson(req, res, '/providers');
});

/**
 * Proxy de catálogo — jogos por provedor
 * GET /api/v2/games?provider=
 */
app.get('/api/v2/games', (req, res) => {
  void proxyPlayFiversJson(req, res, '/games');
});

/**
 * Endpoint para fazer proxy do game_launch
 * POST /api/game_launch
 * 
 * Faz proxy da requisição para a API Play Fiver usando o IP do servidor
 */
app.post('/api/game_launch', async (req, res) => {
  try {
    const {
      agentToken,
      secretKey,
      user_code,
      game_code,
      provider,
      game_original,
      user_balance,
      user_rtp,
      lang
    } = req.body;

    console.log(
      '🎮 Requisição de game_launch recebida:',
      JSON.stringify({ user_code, game_code, provider, game_original }, null, 2)
    );

    // Aviator próprio — abre o clone local com carteira Supabase
    if (AVIATOR_GAME_ENABLED && isAviatorGameCode(game_code, provider)) {
      const launchUrl = buildAviatorLaunchUrl(PUBLIC_API_URL, {
        userCode: user_code,
        lang: lang || 'pt',
        balance: user_balance ?? 0,
      });
      console.log('✈️  game_launch Aviator próprio:', launchUrl);
      return res.status(200).json({
        status: 1,
        launch_url: launchUrl,
        msg: 'Aviator VenuzBET',
        user_code,
        user_balance: user_balance ?? 0,
      });
    }

    // Validar campos obrigatórios
    if (!agentToken || !secretKey || !user_code || !game_code) {
      return res.status(400).json({
        status: 0,
        msg: 'Campos obrigatórios faltando: agentToken, secretKey, user_code, game_code'
      });
    }

    if (GAME_LAUNCH_MOCK) {
      const launchUrl = `${PUBLIC_API_URL}/dev/game?code=${encodeURIComponent(game_code)}&user=${encodeURIComponent(user_code)}&balance=${encodeURIComponent(String(user_balance ?? 0))}`;
      console.log('🧪 game_launch em modo mock:', launchUrl);
      return res.status(200).json({
        status: 1,
        launch_url: launchUrl,
        msg: 'Modo teste local (GAME_LAUNCH_MOCK=true)',
        user_code,
        user_balance: user_balance ?? 0,
      });
    }

    // Fazer requisição para a API Play Fiver usando o IP do servidor
    const resolvedGameOriginal = await shouldLaunchWithGameOriginal(
      game_code,
      provider,
      game_original
    );

    console.log(
      '🎮 game_original resolvido:',
      JSON.stringify(
        { game_code, provider, requested: game_original, resolved: resolvedGameOriginal },
        null,
        2
      )
    );

    const playFiverResponse = await fetch(`${PLAYFIVERS_UPSTREAM}/api/v2/game_launch`, {
      method: 'POST',
      headers: PLAYFIVERS_FETCH_HEADERS,
      body: JSON.stringify({
        agentToken,
        secretKey,
        user_code,
        game_code,
        ...(provider !== undefined && provider !== null && provider !== '' ? { provider } : {}),
        game_original: resolvedGameOriginal,
        user_balance: user_balance || 0,
        user_rtp: user_rtp || 70,
        lang: lang || 'pt',
      }),
    });

    const rawText = await playFiverResponse.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('❌ Resposta inválida da PlayFivers:', rawText.slice(0, 300));
      return res.status(502).json({
        status: 0,
        msg: 'Resposta inválida da API PlayFivers',
      });
    }

    // Retornar resposta da API Play Fiver
    if (!playFiverResponse.ok) {
      return res.status(playFiverResponse.status).json(data);
    }

    res.status(200).json(data);

  } catch (error) {
    console.error('❌ Erro ao fazer proxy do game_launch:', error);
    res.status(500).json({
      status: 0,
      msg: 'Erro interno do servidor ao lançar jogo'
    });
  }
});

/**
 * Lista rodadas grátis concedidas na PlayFivers (filtra por usuário)
 * GET /api/free_bonus?user_code=email@usuario.com
 */
app.get('/api/free_bonus', async (req, res) => {
  try {
    const userCode = String(req.query.user_code || '').trim();
    const { token, secret } = getPlayFiverCredentials(req.query);

    if (!userCode) {
      return res.status(400).json({
        status: false,
        msg: 'user_code obrigatório',
        data: [],
      });
    }

    console.log('🎁 Listagem de free_bonus para:', userCode);

    if (GAME_LAUNCH_MOCK) {
      return res.status(200).json({
        status: true,
        msg: '',
        data: [
          {
            id: 1,
            game_id: 'vs20olympx',
            game_name: 'Gates of Olympus 1000',
            player_id: userCode,
            rounds: 15,
            total_rounds: 15,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ],
      });
    }

    const playFiverResponse = await fetchPlayFiversFreeBonusList(token, secret);
    const rawText = await playFiverResponse.text();
    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('❌ Resposta inválida da PlayFivers (list free_bonus):', rawText.slice(0, 300));
      return res.status(502).json({
        status: false,
        msg: 'Resposta inválida da API PlayFivers',
        data: [],
      });
    }

    if (!playFiverResponse.ok) {
      return res.status(playFiverResponse.status).json(data);
    }

    const allBonuses = Array.isArray(data?.data) ? data.data : [];
    const userCodeLower = userCode.toLowerCase();
    const filtered = allBonuses.filter(
      (bonus) => String(bonus?.player_id || '').toLowerCase() === userCodeLower
    );

    res.status(200).json({
      status: data?.status ?? true,
      msg: data?.msg ?? '',
      data: filtered,
    });
  } catch (error) {
    console.error('❌ Erro ao listar free_bonus:', error);
    res.status(500).json({
      status: false,
      msg: 'Erro interno do servidor ao listar rodadas grátis',
      data: [],
    });
  }
});

/**
 * Concede rodadas grátis ao ganhar na roleta (resolve slug → game_code se necessário)
 * POST /api/prize_wheel/grant
 */
app.post('/api/prize_wheel/grant', async (req, res) => {
  try {
    const { user_code, game_code, jogo_slug, provider_slug, jogo_nome, rounds } = req.body;
    const { token, secret } = getPlayFiverCredentials(req.body);

    let resolvedGameCode = game_code ? String(game_code).trim() : null;
    if (!resolvedGameCode && (jogo_slug || jogo_nome)) {
      resolvedGameCode = await resolveGameCodeFromSlug(jogo_slug, provider_slug, jogo_nome);
    }

    if (!user_code) {
      return res.status(400).json({
        status: false,
        msg: 'Campo obrigatório: user_code',
      });
    }

    if (rounds == null || Number(rounds) <= 0) {
      return res.status(400).json({
        status: false,
        msg: 'Campo obrigatório: rounds (número maior que zero)',
      });
    }

    if (!resolvedGameCode) {
      return res.status(400).json({
        status: false,
        msg: `Não foi possível resolver game_code para jogo_slug="${jogo_slug || ''}" jogo_nome="${jogo_nome || ''}"`,
      });
    }

    console.log(
      '🎡 prize_wheel/grant:',
      JSON.stringify({ user_code, game_code: resolvedGameCode, rounds }, null, 2)
    );

    const grantResult = await grantPlayFiversFreeBonus({
      token,
      secret,
      user_code,
      game_code: resolvedGameCode,
      rounds,
    });

    if (!grantResult.ok) {
      return res.status(grantResult.status || 502).json(grantResult.data);
    }

    res.status(200).json(grantResult.data);
  } catch (error) {
    console.error('❌ Erro em prize_wheel/grant:', error);
    res.status(500).json({
      status: false,
      msg: 'Erro interno ao conceder rodadas da roleta',
    });
  }
});

/**
 * Proxy para conceder rodadas grátis na PlayFivers
 * POST /api/free_bonus
 */
app.post('/api/free_bonus', async (req, res) => {
  try {
    const { user_code, game_code, rounds } = req.body;
    const { token, secret } = getPlayFiverCredentials(req.body);

    console.log('🎁 Requisição de free_bonus recebida:', JSON.stringify({ user_code, game_code, rounds }, null, 2));

    const grantResult = await grantPlayFiversFreeBonus({
      token,
      secret,
      user_code,
      game_code,
      rounds,
    });

    if (!grantResult.ok) {
      return res.status(grantResult.status || 502).json(grantResult.data);
    }

    res.status(200).json(grantResult.data);
  } catch (error) {
    console.error('❌ Erro ao fazer proxy do free_bonus:', error);
    res.status(500).json({
      status: false,
      msg: 'Erro interno do servidor ao conceder rodadas grátis',
    });
  }
});

// ============================================
// ENDPOINTS DO AViator
// ============================================

if (AVIATOR_API_ENABLED) {
/**
 * Função para gerar multiplicador aleatório entre 1-3x
 */
function generateRandomMultiplier() {
  // Gerar multiplicador entre 1.01 e 3.00
  const multiplier = 1.01 + Math.random() * 1.99; // 1.01 até 2.99 (aproximadamente 3.00)
  return parseFloat(multiplier.toFixed(2));
}

/**
 * Obter rodada atual do Aviator
 * GET /api/aviator/current
 */
app.get('/api/aviator/current', async (req, res) => {
  try {
    // Buscar a rodada mais recente que está em 'waiting' ou 'flying'
    const { data: currentRound, error } = await supabase
      .from('aviator_rounds')
      .select('*')
      .in('status', ['waiting', 'flying'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao buscar rodada atual:', error);
      return res.status(500).json({ error: 'Erro ao buscar rodada atual' });
    }

    // Se não há rodada ativa, criar uma nova em estado 'waiting'
    if (!currentRound) {
      const targetMultiplier = generateRandomMultiplier();
      const { data: newRound, error: createError } = await supabase
        .from('aviator_rounds')
        .insert({
          target_multiplier: targetMultiplier,
          status: 'waiting'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Erro ao criar nova rodada:', createError);
        return res.status(500).json({ error: 'Erro ao criar nova rodada' });
      }

      return res.json({
        round: newRound,
        currentMultiplier: 1.0,
        history: []
      });
    }

    // Buscar histórico das últimas 30 velas da tabela aviator_velas
    const { data: velas } = await supabase
      .from('aviator_velas')
      .select('multiplier')
      .order('created_at', { ascending: false })
      .limit(30);

    // Calcular multiplicador atual baseado no tempo decorrido
    let currentMultiplier = 1.0;
    if (currentRound.status === 'flying' && currentRound.started_at) {
      const now = new Date();
      const startedAt = new Date(currentRound.started_at);
      const elapsedMilliseconds = now.getTime() - startedAt.getTime();
      const elapsedSeconds = elapsedMilliseconds / 1000;
      
      // Incrementa 0.01 a cada 50ms (20 vezes por segundo = 0.2 por segundo)
      // Fórmula: 1.0 + (segundos * 20 * 0.01) = 1.0 + (segundos * 0.2)
      currentMultiplier = Math.min(
        1.0 + (elapsedSeconds * 0.2),
        currentRound.target_multiplier
      );
      
      // Garantir que nunca seja menor que 1.0
      currentMultiplier = Math.max(1.0, currentMultiplier);
    } else if (currentRound.status === 'waiting') {
      // Se está esperando, multiplicador é 1.0
      currentMultiplier = 1.0;
    } else if (currentRound.status === 'crashed') {
      // Se crashou, usar o multiplicador final
      currentMultiplier = currentRound.final_multiplier || currentRound.target_multiplier;
    }

    const response = {
      round: currentRound,
      currentMultiplier: parseFloat(currentMultiplier.toFixed(2)),
      history: (velas || []).map(v => parseFloat(v.multiplier)).filter(Boolean)
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Erro ao obter rodada atual:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Iniciar nova rodada (vela)
 * POST /api/aviator/round/start
 */
app.post('/api/aviator/round/start', async (req, res) => {
  try {
    // Verificar se há rodada em andamento
    const { data: activeRound } = await supabase
      .from('aviator_rounds')
      .select('id, status')
      .in('status', ['waiting', 'flying'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeRound && activeRound.status === 'flying') {
      return res.status(400).json({ error: 'Já existe uma rodada em andamento' });
    }

    // Finalizar rodada anterior se estiver em 'waiting'
    if (activeRound && activeRound.status === 'waiting') {
      await supabase
        .from('aviator_rounds')
        .update({ status: 'crashed', crashed_at: new Date().toISOString(), final_multiplier: 1.0 })
        .eq('id', activeRound.id);
    }

    // Criar nova rodada
    const targetMultiplier = generateRandomMultiplier();
    const { data: newRound, error } = await supabase
      .from('aviator_rounds')
      .insert({
        target_multiplier: targetMultiplier,
        status: 'waiting',
        started_at: new Date(Date.now() + 9800).toISOString() // Começa em 9.8 segundos
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar rodada:', error);
      return res.status(500).json({ error: 'Erro ao criar rodada' });
    }

    res.json({ round: newRound });

  } catch (error) {
    console.error('❌ Erro ao iniciar rodada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Atualizar estado da rodada (chamado periodicamente para atualizar multiplicador)
 * POST /api/aviator/round/update
 */
app.post('/api/aviator/round/update', async (req, res) => {
  try {
    const { roundId } = req.body;

    if (!roundId) {
      return res.status(400).json({ error: 'roundId é obrigatório' });
    }

    // Buscar rodada
    const { data: round, error: fetchError } = await supabase
      .from('aviator_rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (fetchError || !round) {
      return res.status(404).json({ error: 'Rodada não encontrada' });
    }

    if (round.status !== 'flying') {
      return res.json({ round, currentMultiplier: 1.0 });
    }

    // Calcular multiplicador atual
    const now = new Date();
    const startedAt = new Date(round.started_at);
    const elapsedSeconds = (now - startedAt) / 1000;
    const currentMultiplier = Math.min(
      1.0 + (elapsedSeconds * 20 * 0.01),
      round.target_multiplier
    );

    // Verificar se deve crashar
    if (currentMultiplier >= round.target_multiplier) {
      await supabase
        .from('aviator_rounds')
        .update({
          status: 'crashed',
          crashed_at: now.toISOString(),
          final_multiplier: round.target_multiplier
        })
        .eq('id', roundId);

      // Buscar apostas ativas que não fizeram cashout
      const { data: activeBets } = await supabase
        .from('aviator_bets')
        .select('id, usuario_id, bet_amount')
        .eq('round_id', roundId)
        .eq('status', 'active');

      // Processar apostas que não fizeram cashout
      if (activeBets && activeBets.length > 0) {
        // Atualizar status das apostas
        await supabase
          .from('aviator_bets')
          .update({
            status: 'crashed',
            profit: 0
          })
          .eq('round_id', roundId)
          .eq('status', 'active');

        // Salvar transações para cada aposta que crashou
        const transactions = activeBets.map(bet => ({
          usuario_id: bet.usuario_id,
          txn_id: `aviator_${bet.id}_crash_${Date.now()}`,
          tipo: 'Perdeu',
          jogo: 'Aviator',
          valor: bet.bet_amount,
          retorno: 0,
          status: 'Finalizado',
          com_bonus: 'Não',
          data: now.toISOString()
        }));

        if (transactions.length > 0) {
          await supabase
            .from('transacoes_jogos')
            .insert(transactions);
        }
      }

      // Inserir vela na tabela aviator_velas
      try {
        await supabase
          .from('aviator_velas')
          .insert({
            round_id: roundId,
            multiplier: round.target_multiplier
          });
      } catch {
        // Ignorar erro se a tabela não existir ainda ou se já foi inserida pelo trigger
      }

      return res.json({
        round: { ...round, status: 'crashed', final_multiplier: round.target_multiplier },
        currentMultiplier: round.target_multiplier
      });
    }

    res.json({
      round,
      currentMultiplier: parseFloat(currentMultiplier.toFixed(2))
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar rodada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Fazer aposta no Aviator
 * POST /api/aviator/bet
 */
app.post('/api/aviator/bet', async (req, res) => {
  try {
    const { user_code, bet_amount } = req.body;

    console.log('[AVIATOR BET] Requisição recebida:', {
      user_code: user_code ?? null,
      bet_amount_raw: bet_amount,
      bet_amount_type: typeof bet_amount,
      body_keys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
    });

    if (user_code == null || user_code === '' || bet_amount == null || bet_amount === '') {
      console.log('[AVIATOR BET] Rejeitado: user_code ou bet_amount ausente');
      return res.status(400).json({ error: 'user_code e bet_amount são obrigatórios' });
    }

    const betNum = typeof bet_amount === 'number' ? bet_amount : parseFloat(String(bet_amount).replace(',', '.'));
    if (!Number.isFinite(betNum) || betNum <= 0) {
      console.log('[AVIATOR BET] Rejeitado: valor da aposta inválido', { bet_amount, betNum });
      return res.status(400).json({ error: 'Valor da aposta deve ser maior que zero' });
    }

    // Buscar usuário
    let { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, saldo, email')
      .eq('email', user_code.trim())
      .maybeSingle();

    if (!usuario) {
      // Tentar busca case-insensitive
      const { data: usuarioIlike } = await supabase
        .from('usuarios')
        .select('id, saldo, email')
        .ilike('email', user_code.trim())
        .maybeSingle();
      
      if (usuarioIlike) {
        usuario = usuarioIlike;
      }
    }

    if (!usuario) {
      console.log('[AVIATOR BET] Usuário não encontrado para user_code:', JSON.stringify(user_code.trim()));
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const saldoNum = parseFloat(String(usuario.saldo ?? '').replace(',', '.'));
    console.log('[AVIATOR BET] Usuário resolvido:', {
      usuario_id: usuario.id,
      email_db: usuario.email,
      saldo_raw: usuario.saldo,
      saldo_num: saldoNum,
      aposta_num: betNum,
      saldo_ok: Number.isFinite(saldoNum) && saldoNum >= betNum,
    });

    // Verificar saldo (sempre comparar números — bet_amount do JSON costuma vir como string)
    if (!Number.isFinite(saldoNum)) {
      console.error('[AVIATOR BET] Saldo inválido (NaN) no banco para usuário', usuario.id);
      return res.status(500).json({ error: 'Saldo do usuário inválido' });
    }
    if (saldoNum < betNum) {
      console.log('[AVIATOR BET] Saldo insuficiente:', {
        saldo_num: saldoNum,
        aposta_num: betNum,
        diferenca: saldoNum - betNum,
      });
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    // Buscar rodada atual
    const { data: currentRound } = await supabase
      .from('aviator_rounds')
      .select('*')
      .in('status', ['waiting', 'flying'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!currentRound) {
      console.log('[AVIATOR BET] Sem rodada ativa (waiting/flying)');
      return res.status(400).json({ error: 'Não há rodada ativa no momento' });
    }

    // Verificar se já tem aposta ativa nesta rodada
    const { data: existingBet } = await supabase
      .from('aviator_bets')
      .select('id')
      .eq('round_id', currentRound.id)
      .eq('usuario_id', usuario.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingBet) {
      console.log('[AVIATOR BET] Já existe aposta ativa nesta rodada:', {
        round_id: currentRound.id,
        bet_id: existingBet.id,
        usuario_id: usuario.id,
      });
      return res.status(400).json({ error: 'Você já tem uma aposta ativa nesta rodada' });
    }

    // Deduzir saldo
    const newBalance = saldoNum - betNum;
    console.log('[AVIATOR BET] Debitando saldo:', {
      usuario_id: usuario.id,
      saldo_antes: saldoNum,
      aposta: betNum,
      saldo_depois: newBalance,
      round_id: currentRound.id,
    });

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ saldo: newBalance })
      .eq('id', usuario.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar saldo:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar saldo' });
    }

    // Criar aposta
    const { data: bet, error: betError } = await supabase
      .from('aviator_bets')
      .insert({
        round_id: currentRound.id,
        usuario_id: usuario.id,
        bet_amount: betNum,
        status: 'active'
      })
      .select()
      .single();

    if (betError) {
      console.error('❌ Erro ao criar aposta:', betError);
      // Reverter saldo em caso de erro
      await supabase
        .from('usuarios')
        .update({ saldo: usuario.saldo })
        .eq('id', usuario.id);
      console.log('[AVIATOR BET] Saldo revertido após falha ao inserir aposta:', {
        usuario_id: usuario.id,
        saldo_revertido_para: usuario.saldo,
      });
      return res.status(500).json({ error: 'Erro ao criar aposta' });
    }

    console.log('[AVIATOR BET] Aposta criada com sucesso:', {
      bet_id: bet?.id,
      usuario_id: usuario.id,
      round_id: currentRound.id,
      bet_amount: betNum,
      newBalance,
    });

    res.json({
      bet,
      newBalance
    });

  } catch (error) {
    console.error('❌ Erro ao fazer aposta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Fazer cashout
 * POST /api/aviator/cashout
 */
app.post('/api/aviator/cashout', async (req, res) => {
  try {
    const { user_code, round_id } = req.body;

    if (!user_code || !round_id) {
      return res.status(400).json({ error: 'user_code e round_id são obrigatórios' });
    }

    // Buscar usuário
    let { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, saldo, email')
      .eq('email', user_code.trim())
      .maybeSingle();

    if (!usuario) {
      const { data: usuarioIlike } = await supabase
        .from('usuarios')
        .select('id, saldo, email')
        .ilike('email', user_code.trim())
        .maybeSingle();
      
      if (usuarioIlike) {
        usuario = usuarioIlike;
      }
    }

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar aposta ativa
    const { data: bet, error: betError } = await supabase
      .from('aviator_bets')
      .select('*')
      .eq('round_id', round_id)
      .eq('usuario_id', usuario.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!bet || betError) {
      return res.status(404).json({ error: 'Aposta não encontrada ou já finalizada' });
    }

    // Buscar rodada para obter multiplicador atual
    const { data: round } = await supabase
      .from('aviator_rounds')
      .select('*')
      .eq('id', round_id)
      .single();

    if (!round || round.status !== 'flying') {
      return res.status(400).json({ error: 'Rodada não está em andamento' });
    }

    // Calcular multiplicador atual
    const now = new Date();
    const startedAt = new Date(round.started_at);
    const elapsedSeconds = (now - startedAt) / 1000;
    const currentMultiplier = Math.min(
      1.0 + (elapsedSeconds * 20 * 0.01),
      round.target_multiplier
    );

    // Calcular lucro
    const profit = parseFloat(bet.bet_amount) * currentMultiplier;
    const newBalance = parseFloat(usuario.saldo) + profit;

    // Atualizar aposta
    const { error: updateBetError } = await supabase
      .from('aviator_bets')
      .update({
        status: 'cashed_out',
        cashout_multiplier: parseFloat(currentMultiplier.toFixed(2)),
        profit: profit,
        cashed_out_at: now.toISOString()
      })
      .eq('id', bet.id);

    if (updateBetError) {
      console.error('❌ Erro ao atualizar aposta:', updateBetError);
      return res.status(500).json({ error: 'Erro ao processar cashout' });
    }

    // Atualizar saldo
    const { error: updateBalanceError } = await supabase
      .from('usuarios')
      .update({ saldo: newBalance })
      .eq('id', usuario.id);

    if (updateBalanceError) {
      console.error('❌ Erro ao atualizar saldo:', updateBalanceError);
      return res.status(500).json({ error: 'Erro ao atualizar saldo' });
    }

    // Salvar transação
    const transactionData = {
      usuario_id: usuario.id,
      txn_id: `aviator_${bet.id}_${Date.now()}`,
      tipo: 'Ganhou',
      jogo: 'Aviator',
      valor: bet.bet_amount,
      retorno: profit,
      status: 'Finalizado',
      com_bonus: 'Não',
      data: now.toISOString()
    };

    await supabase
      .from('transacoes_jogos')
      .insert(transactionData);

    res.json({
      success: true,
      cashoutMultiplier: parseFloat(currentMultiplier.toFixed(2)),
      profit: profit,
      newBalance: newBalance
    });

  } catch (error) {
    console.error('❌ Erro ao fazer cashout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Obter histórico de velas
 * GET /api/aviator/history
 */
app.get('/api/aviator/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;

    // Buscar velas da tabela aviator_velas
    const { data: velas, error } = await supabase
      .from('aviator_velas')
      .select('multiplier, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erro ao buscar histórico de velas:', error);
      // Fallback para buscar das rodadas caso a tabela de velas não exista ainda
      const { data: rounds, error: roundsError } = await supabase
        .from('aviator_rounds')
        .select('final_multiplier')
        .eq('status', 'crashed')
        .not('final_multiplier', 'is', null)
        .order('crashed_at', { ascending: false })
        .limit(limit);

      if (roundsError) {
        return res.status(500).json({ error: 'Erro ao buscar histórico' });
      }

      return res.json({
        history: (rounds || []).map(r => parseFloat(r.final_multiplier)).filter(Boolean)
      });
    }

    res.json({
      history: (velas || []).map(v => parseFloat(v.multiplier)).filter(Boolean)
    });

  } catch (error) {
    console.error('❌ Erro ao obter histórico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Obter apostas de um usuário em uma rodada
 * GET /api/aviator/bets/:round_id
 */
app.get('/api/aviator/bets/:round_id', async (req, res) => {
  try {
    const { round_id } = req.params;
    const { user_code } = req.query;

    if (!user_code) {
      return res.status(400).json({ error: 'user_code é obrigatório' });
    }

    // Buscar usuário
    let { data: usuario } = await supabase
      .from('usuarios')
      .select('id, email')
      .eq('email', user_code.trim())
      .maybeSingle();

    if (!usuario) {
      const { data: usuarioIlike } = await supabase
        .from('usuarios')
        .select('id, email')
        .ilike('email', user_code.trim())
        .maybeSingle();
      
      if (usuarioIlike) {
        usuario = usuarioIlike;
      }
    }

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const { data: bets, error } = await supabase
      .from('aviator_bets')
      .select('*')
      .eq('round_id', round_id)
      .eq('usuario_id', usuario.id)
      .order('placed_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar apostas:', error);
      return res.status(500).json({ error: 'Erro ao buscar apostas' });
    }

    res.json({ bets: bets || [] });

  } catch (error) {
    console.error('❌ Erro ao obter apostas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================================
// SISTEMA AUTOMÁTICO DE GERENCIAMENTO DE RODADAS
// ============================================

let roundManagerInterval = null;

async function manageRounds() {
  try {
    // Buscar rodada atual (waiting ou flying)
    const { data: currentRound } = await supabase
      .from('aviator_rounds')
      .select('*')
      .in('status', ['waiting', 'flying'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Se não há rodada ativa, verificar se precisa criar uma nova
    if (!currentRound) {
      // Buscar última rodada crashada para verificar se já passou tempo suficiente
      const { data: lastCrashed } = await supabase
        .from('aviator_rounds')
        .select('crashed_at, updated_at')
        .eq('status', 'crashed')
        .order('crashed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      let shouldCreate = true;

      // Se há uma rodada crashada recente, aguardar 4 segundos antes de criar nova
      if (lastCrashed) {
        const crashedAt = new Date(lastCrashed.crashed_at || lastCrashed.updated_at);
        const timeSinceCrash = now - crashedAt;
        const waitTimeAfterCrash = 4000; // 4 segundos após crash

        if (timeSinceCrash < waitTimeAfterCrash) {
          shouldCreate = false;
        }
      }

      if (shouldCreate) {
        // Criar nova rodada em estado 'waiting'
        const targetMultiplier = generateRandomMultiplier();
        const { data: newRound, error } = await supabase
          .from('aviator_rounds')
          .insert({
            target_multiplier: targetMultiplier,
            status: 'waiting'
          })
          .select()
          .single();
        
        if (error) {
          console.error('❌ [AVIATOR] Erro ao criar vela:', error);
          return;
        }
        
        if (!newRound) {
          console.error('❌ [AVIATOR] Vela não foi criada - resposta vazia');
        }
      }
      return;
    }

    const now = new Date();
    const roundCreatedAt = new Date(currentRound.created_at);

    // Se está em 'waiting' e passou 9.8 segundos, iniciar voo
    if (currentRound.status === 'waiting') {
      const waitTime = 9800; // 9.8 segundos
      if (now - roundCreatedAt >= waitTime) {
        await supabase
          .from('aviator_rounds')
          .update({
            status: 'flying',
            started_at: now.toISOString()
          })
          .eq('id', currentRound.id);
      }
      return;
    }

    // Se está em 'flying', atualizar multiplicador e verificar crash
    if (currentRound.status === 'flying' && currentRound.started_at) {
      const startedAt = new Date(currentRound.started_at);
      const elapsedSeconds = (now - startedAt) / 1000;
      const currentMultiplier = Math.min(
        1.0 + (elapsedSeconds * 20 * 0.01),
        currentRound.target_multiplier
      );

      // Verificar se deve crashar
      if (currentMultiplier >= currentRound.target_multiplier) {
        // Usar UPDATE com condição para só atualizar se ainda estiver flying (evita processamento múltiplo)
        const { error: updateError, data: updatedRound } = await supabase
          .from('aviator_rounds')
          .update({
            status: 'crashed',
            crashed_at: now.toISOString(),
            final_multiplier: currentRound.target_multiplier
          })
          .eq('id', currentRound.id)
          .eq('status', 'flying') // Só atualiza se ainda estiver flying (evita condições de corrida)
          .select()
          .single();
        
        // Se não atualizou (já estava crashed ou foi atualizado por outro processo), retornar imediatamente
        if (updateError || !updatedRound) {
          return;
        }
        
        // Só processar se realmente atualizou (garantia de processamento único)
        // Buscar apostas ativas que não fizeram cashout
        const { data: activeBets } = await supabase
          .from('aviator_bets')
          .select('id, usuario_id, bet_amount')
          .eq('round_id', currentRound.id)
          .eq('status', 'active');

        // Processar apostas que não fizeram cashout
        if (activeBets && activeBets.length > 0) {
          // Atualizar status das apostas
          await supabase
            .from('aviator_bets')
            .update({
              status: 'crashed',
              profit: 0
            })
            .eq('round_id', currentRound.id)
            .eq('status', 'active');

          // Salvar transações para cada aposta que crashou
          const transactions = activeBets.map(bet => ({
            usuario_id: bet.usuario_id,
            txn_id: `aviator_${bet.id}_crash_${Date.now()}`,
            tipo: 'Perdeu',
            jogo: 'Aviator',
            valor: bet.bet_amount,
            retorno: 0,
            status: 'Finalizado',
            com_bonus: 'Não',
            data: now.toISOString()
          }));

          if (transactions.length > 0) {
            await supabase
              .from('transacoes_jogos')
              .insert(transactions);
          }
        }

        // Inserir vela na tabela aviator_velas (apenas uma vez)
        try {
          // Verificar se já existe na tabela de velas
          const { data: existingVela } = await supabase
            .from('aviator_velas')
            .select('id')
            .eq('round_id', currentRound.id)
            .maybeSingle();
          
          // Só inserir se não existir
          if (!existingVela) {
            await supabase
              .from('aviator_velas')
              .insert({
                round_id: currentRound.id,
                multiplier: currentRound.target_multiplier
              })
              .select()
              .single();
          }
        } catch {
          // Ignorar erro se a tabela não existir ainda ou se já foi inserida pelo trigger
        }

        // Não criar nova rodada aqui - será criada automaticamente na próxima execução após 4 segundos
      }
    }

  } catch (error) {
    console.error('❌ [AVIATOR] Erro no gerenciador de rodadas:', error);
    console.error('❌ [AVIATOR] Stack trace:', error.stack);
  }
}

// Iniciar gerenciador de rodadas (executa a cada 50ms)
function startRoundManager() {
  if (roundManagerInterval) {
    clearInterval(roundManagerInterval);
  }
  
  // Criar primeira rodada imediatamente
  manageRounds().catch(err => {
    console.error('❌ [AVIATOR] Erro ao criar primeira rodada:', err);
  });
  
  // Executar a cada 50ms
  roundManagerInterval = setInterval(() => {
    manageRounds().catch(err => {
      console.error('❌ [AVIATOR] Erro no gerenciador de rodadas:', err);
    });
  }, 50);
}

} // fim AVIATOR_API_ENABLED

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Play Fiver Webhook API'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Play Fiver Webhook API',
    endpoints: {
      balance: 'POST /webhook - Callback único PlayFivers (BALANCE + WinBet)',
      transaction: 'Mesmo handler em /webhook · /api/webhook · /api',
      providers: 'GET /api/v2/providers - Proxy de provedores (usa IP do servidor)',
      games: 'GET /api/v2/games?provider= - Proxy de jogos por provedor',
      gameLaunch: 'POST /api/game_launch - Proxy para lançar jogos (usa IP do servidor)',
      freeBonusList: 'GET /api/free_bonus?user_code= - Lista rodadas grátis do jogador na PlayFivers',
      freeBonusGrant: 'POST /api/free_bonus - Concede rodadas grátis na PlayFivers',
      prizeWheelGrant: 'POST /api/prize_wheel/grant - Concede rodadas ao ganhar na roleta',
      depositPixCreate: 'POST /api/deposit/pix/create - Gera cobrança PIX (MisticPay)',
      depositPixCheck: 'POST /api/deposit/pix/check - Consulta e confirma pagamento PIX',
      withdrawApprove: 'POST /api/withdraw/approve - Aprova saque e paga via MisticPay (admin)',
      withdrawMisticPayWebhook: 'POST /api/withdraw/misticpay/webhook - Callback MisticPay saque',
      supabaseProxy: {
        query: 'POST /api/supabase/{select|insert|update|delete|upsert}/:table — Proxy legível no Network',
        rpc: 'POST /api/supabase/rpc/:name — Funções RPC (ex.: obter_config_plataforma)',
        authSignIn: 'POST /api/supabase/auth/sign-in',
        authSignUp: 'POST /api/supabase/auth/sign-up',
        authSession: 'GET /api/supabase/auth/session',
      },
      cpfHub: 'GET /api/cpfhub/cpf/:cpf — Consulta CPF (CPF Hub)',
      webhooksTest: 'POST /api/webhooks/test — Testar webhook (admin)',
      aviatorGame: AVIATOR_GAME_ENABLED
        ? {
            play: 'GET /aviator/ — Jogo Aviator próprio (clone Spribe)',
            wallet: 'GET/POST /aviator/wallet/* — Carteira integrada Supabase',
            roundSync: 'POST /aviator/wallet/round — Sincroniza rodada/vela no Supabase',
            history: 'GET /aviator/wallet/history — Histórico de velas (Supabase)',
            gameApi: 'Proxy /api/game/* → motor Python ao vivo',
          }
        : 'desabilitado (AVIATOR_GAME_ENABLED=false)',
      aviatorLegacy: AVIATOR_API_ENABLED
        ? {
            current: 'GET /api/aviator/current - Obter rodada atual',
            startRound: 'POST /api/aviator/round/start - Iniciar nova rodada',
            updateRound: 'POST /api/aviator/round/update - Atualizar estado da rodada',
            bet: 'POST /api/aviator/bet - Fazer aposta',
            cashout: 'POST /api/aviator/cashout - Fazer cashout',
            history: 'GET /api/aviator/history - Obter histórico',
            bets: 'GET /api/aviator/bets/:round_id - Obter apostas de uma rodada',
          }
        : 'desabilitada (AVIATOR_API_ENABLED=true para ativar)',
      health: 'GET /health'
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Callback PlayFivers (único): http://localhost:${PORT}/webhook`);
  console.log('   Aliases aceitos: /api/webhook · /api · /game_callback');
  console.log(`📚 Catálogo (providers/games): http://localhost:${PORT}/api/v2/providers`);
  console.log(`🎮 Game Launch Proxy: http://localhost:${PORT}/api/game_launch`);
  if (GAME_LAUNCH_MOCK) {
    console.log('🧪 GAME_LAUNCH_MOCK ativo — jogos abrem em /dev/game (sem apiroyal.shop / PlayFivers remoto)');
  }
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);

  if (AVIATOR_GAME_ENABLED) {
    const pythonPort = Number(process.env.AVIATOR_PYTHON_PORT || 8001);
    startAviatorPythonServer(PORT, pythonPort);
    console.log(`✈️  Aviator próprio ativo — jogo em ${PUBLIC_API_URL}/aviator/`);
  } else {
    console.log('✈️  Aviator próprio desabilitado (AVIATOR_GAME_ENABLED=false)');
  }

  if (AVIATOR_API_ENABLED) {
    startRoundManager();
    console.log(`✈️  Aviator API ativa em /api/aviator`);
  } else {
    console.log('✈️  Aviator API desabilitada (use AVIATOR_API_ENABLED=true para ativar)');
  }
});

