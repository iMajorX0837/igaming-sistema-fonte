import crypto from 'crypto';
import { getAviatorGameSessionCookie } from './authCookies.js';

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isTrustProxyEnabled() {
  const value = String(process.env.TRUST_PROXY || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function normalizeIp(ip) {
  if (!ip) return '';
  const value = String(ip).trim();
  if (value.startsWith('::ffff:')) return value.slice(7);
  return value;
}

/**
 * IP do cliente para rate limit / logs.
 * Sem TRUST_PROXY: ignora X-Forwarded-For (evita spoof direto no Node).
 * Com TRUST_PROXY=true (nginx/cloudflare na frente): usa primeiro hop de X-Forwarded-For.
 */
export function getClientIp(req) {
  const socketIp = normalizeIp(req.socket?.remoteAddress || '');

  if (!isTrustProxyEnabled()) {
    return socketIp;
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const hops = String(forwarded)
      .split(',')
      .map((hop) => normalizeIp(hop.trim()))
      .filter(Boolean);
    if (hops.length > 0) return hops[0];
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) return normalizeIp(String(realIp));

  return socketIp;
}

export function isLocalhostRequest(req) {
  const ip = getClientIp(req);
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.endsWith('127.0.0.1')
  );
}

function getAviatorInternalSecret() {
  return (process.env.AVIATOR_INTERNAL_SECRET || '').trim();
}

export function validateAviatorInternal(req) {
  const secret = getAviatorInternalSecret();
  if (!secret) {
    if (isProduction()) return false;
    return isLocalhostRequest(req);
  }

  const provided =
    req.headers['x-aviator-internal'] || req.headers['X-Aviator-Internal'];
  return provided === secret;
}

function getGameSessionSecret() {
  return (
    process.env.AVIATOR_GAME_SESSION_SECRET ||
    process.env.AVIATOR_INTERNAL_SECRET ||
    ''
  ).trim();
}

export function createAviatorGameSessionToken(userCode, ttlSec = 86_400) {
  const secret = getGameSessionSecret();
  const email = String(userCode || '').trim().toLowerCase();
  if (!secret || !email) return '';

  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${email}:${exp}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${exp}.${sig}`;
}

export function validateAviatorGameSessionToken(userCode, token) {
  const secret = getGameSessionSecret();
  const email = String(userCode || '').trim().toLowerCase();
  if (!secret || !email || !token) return false;

  const parts = String(token).split('.');
  if (parts.length !== 2) return false;

  const exp = Number(parts[0]);
  const sig = parts[1];
  if (!Number.isFinite(exp) || !sig) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;

  const payload = `${email}:${exp}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function extractAviatorGameSessionAuth(req) {
  const token =
    req.headers['x-game-session'] ||
    req.headers['X-Game-Session'] ||
    getAviatorGameSessionCookie(req) ||
    req.body?.game_session;

  const accountEmail = String(
    req.body?.accountEmail ||
      req.body?.account ||
      req.body?.user_code ||
      req.query?.account ||
      req.query?.param1 ||
      ''
  ).trim();

  return { token, accountEmail };
}

export function validateAviatorGameSessionRequest(req) {
  if (validateAviatorInternal(req)) return true;

  const { token, accountEmail } = extractAviatorGameSessionAuth(req);
  if (!accountEmail || !token) return false;

  return validateAviatorGameSessionToken(accountEmail, token);
}

function getPlayFiverWebhookSecret() {
  return (
    process.env.PLAYFIVER_WEBHOOK_SECRET ||
    process.env.PLAYFIVER_SECRET_KEY ||
    ''
  ).trim();
}

function getPlayFiverAgentToken() {
  return (process.env.PLAYFIVER_AGENT_TOKEN || '').trim();
}

/**
 * Formato real dos callbacks PlayFivers (produção): type + user_code (+ slot/sport/live).
 * agent_code/agent_secret no body nem sempre vêm — ver logs do painel PlayFivers.
 */
export function isPlayFiverCallbackBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;

  const type = String(body.type || '').trim().toUpperCase();
  const userCode = String(body.user_code || '').trim();
  if (!type || !userCode) return false;

  if (type === 'BALANCE' || type === 'WINBET') return true;
  if (body.game_type) return true;
  if (body.slot || body.sport || body.sports || body.live) return true;

  return false;
}

function isPlayFiverWebhookTrustEnabled() {
  const raw = String(process.env.PLAYFIVER_WEBHOOK_TRUST_CALLBACK ?? '').trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  // Padrão true: PlayFivers chama só com type/user_code; sem isso saldo nos jogos fica 0.
  return true;
}

/** Credenciais no body — PlayFivers usa agent_code/agent_secret ou agent_token/secret_key. */
function extractPlayFiverWebhookCredentials(body) {
  const payload = body && typeof body === 'object' ? body : {};
  const bodySecret = String(
    payload.agent_secret ||
      payload.agentSecret ||
      payload.secret_key ||
      payload.secretKey ||
      payload.secret ||
      ''
  ).trim();
  const bodyToken = String(
    payload.agent_code ||
      payload.agentCode ||
      payload.agent_token ||
      payload.agentToken ||
      ''
  ).trim();
  return { bodySecret, bodyToken };
}

export function validatePlayFiverWebhook(req) {
  if (process.env.PLAYFIVER_WEBHOOK_SKIP_VALIDATION === 'true') {
    if (isProduction()) {
      console.error('[webhook] PLAYFIVER_WEBHOOK_SKIP_VALIDATION não permitido em produção');
      return false;
    }
    return true;
  }

  const secret = getPlayFiverWebhookSecret();

  if (!secret) {
    if (isProduction()) {
      console.error('[webhook] PLAYFIVER_SECRET_KEY não configurada em produção');
      return false;
    }
    console.warn('[webhook] Validação desabilitada (sem PLAYFIVER_SECRET_KEY)');
    return true;
  }

  const headerSecret =
    req.headers['x-playfiver-secret'] ||
    req.headers['x-webhook-secret'];

  if (headerSecret && headerSecret === secret) {
    return true;
  }

  const signature = req.headers['x-playfiver-signature'];
  if (signature) {
    const body = req.body ?? {};
    const raw = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(body);
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    try {
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return true;
      }
    } catch {
      if (signature === expected) return true;
    }
  }

  // PlayFivers: agent_code + agent_secret (ou agent_token + secret_key).
  const { bodySecret, bodyToken } = extractPlayFiverWebhookCredentials(req.body);
  const expectedToken = getPlayFiverAgentToken();

  if (bodySecret && bodySecret === secret) {
    return true;
  }

  if (bodyToken && expectedToken && bodyToken === expectedToken && bodySecret && bodySecret === secret) {
    return true;
  }

  if (isPlayFiverWebhookTrustEnabled() && isPlayFiverCallbackBody(req.body)) {
    return true;
  }

  return false;
}

/** Motivo seguro (sem vazar secrets) para log quando webhook PlayFivers é rejeitado. */
export function describePlayFiverWebhookRejection(req) {
  const secret = getPlayFiverWebhookSecret();

  if (!secret) return 'PLAYFIVER_SECRET_KEY não configurada';

  const body = req.body ?? {};
  const { bodySecret, bodyToken } = extractPlayFiverWebhookCredentials(body);
  const expectedToken = getPlayFiverAgentToken();

  const parts = [];
  if (req.headers['x-playfiver-secret'] || req.headers['x-webhook-secret']) {
    parts.push('header_secret_presente');
  }
  if (req.headers['x-playfiver-signature']) parts.push('assinatura_presente');
  if (bodySecret) {
    parts.push(bodySecret === secret ? 'body_secret_ok' : 'body_secret_invalido');
  } else {
    parts.push('body_secret_ausente');
  }
  if (bodyToken) {
    parts.push('body_agent_code_presente');
    if (expectedToken) {
      parts.push(bodyToken === expectedToken ? 'body_agent_code_ok' : 'body_agent_code_diferente');
    }
  } else {
    parts.push('body_agent_code_ausente');
  }

  if (isPlayFiverCallbackBody(body)) {
    parts.push(
      isPlayFiverWebhookTrustEnabled() ? 'trust_callback_habilitado' : 'trust_callback_desabilitado'
    );
  }

  return parts.join(', ');
}

export function validateInternalApiSecret(req) {
  const secret = String(process.env.INTERNAL_API_SECRET || '').trim();
  if (!secret) return false;

  const provided =
    req.headers['x-internal-api-secret'] ||
    req.headers['X-Internal-Api-Secret'];
  if (!provided || typeof provided !== 'string') return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret));
  } catch {
    return false;
  }
}

export function createRateLimiter({ windowMs = 60_000, max = 10, keyFn } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const key =
      typeof keyFn === 'function'
        ? keyFn(req)
        : getClientIp(req) || 'unknown';
    const now = Date.now();
    const bucket = hits.get(key) ?? { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente em instantes.',
      });
    }

    return next();
  };
}

function parseCorsOrigins() {
  const raw = (process.env.CORS_ORIGINS || '').trim();
  if (!raw) return null;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isDevLocalOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.localhost')
    );
  } catch {
    return false;
  }
}

function getPublicApiOrigin() {
  const raw = (process.env.PUBLIC_API_URL || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function getPublicSiteOrigin() {
  const raw = (process.env.PUBLIC_SITE_URL || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** Lista efetiva: CORS_ORIGINS + origens de PUBLIC_API_URL e PUBLIC_SITE_URL. */
function getAllowedOrigins() {
  const fromEnv = parseCorsOrigins() || [];
  if (!isProduction()) {
    return fromEnv;
  }
  const extras = [getPublicApiOrigin(), getPublicSiteOrigin()].filter(Boolean);
  const merged = [...fromEnv];
  for (const origin of extras) {
    if (!merged.includes(origin)) merged.push(origin);
  }
  return merged;
}

const CORS_ALLOW_HEADERS =
  'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Game-Session, X-Client-Info';

function rejectCorsOrigin(req, res) {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(403);
  }
  return res.status(403).json({ ok: false, message: 'Origem não permitida' });
}

export function createCorsMiddleware() {
  const allowedOrigins = getAllowedOrigins();

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (!origin) {
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      return next();
    }

    let allowOrigin = null;

    if (allowedOrigins.length) {
      if (!allowedOrigins.includes(origin)) {
        return rejectCorsOrigin(req, res);
      }
      allowOrigin = origin;
    } else if (!isProduction() && isDevLocalOrigin(origin)) {
      allowOrigin = origin;
    } else if (isProduction()) {
      return rejectCorsOrigin(req, res);
    } else {
      return rejectCorsOrigin(req, res);
    }

    res.header('Access-Control-Allow-Origin', allowOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  };
}

export function assertProductionSecrets() {
  if (!isProduction()) return;

  const required = [
    ['SUPABASE_SERVICE_KEY', process.env.SUPABASE_SERVICE_KEY],
    ['PLAYFIVER_AGENT_TOKEN', process.env.PLAYFIVER_AGENT_TOKEN],
    ['PLAYFIVER_SECRET_KEY', process.env.PLAYFIVER_SECRET_KEY],
    ['AVIATOR_INTERNAL_SECRET', process.env.AVIATOR_INTERNAL_SECRET],
    ['INTERNAL_API_SECRET', process.env.INTERNAL_API_SECRET],
  ];

  if (process.env.AVIATOR_API_ENABLED === 'true') {
    console.error('❌ AVIATOR_API_ENABLED=true não é permitido em produção (use /aviator/wallet)');
    process.exit(1);
  }

  const missing = required.filter(([, value]) => !String(value || '').trim()).map(([name]) => name);

  if (!parseCorsOrigins()?.length) {
    missing.push('CORS_ORIGINS');
  }

  if (missing.length) {
    console.error(`❌ Variáveis obrigatórias em produção: ${missing.join(', ')}`);
    process.exit(1);
  }
}
