import crypto from 'crypto';

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || '';
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
    req.query?.gs_token ||
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

export function validatePlayFiverWebhook(req) {
  if (process.env.PLAYFIVER_WEBHOOK_SKIP_VALIDATION === 'true') {
    if (isProduction()) {
      console.error('[webhook] PLAYFIVER_WEBHOOK_SKIP_VALIDATION não permitido em produção');
      return false;
    }
    return true;
  }

  const secret = (
    process.env.PLAYFIVER_WEBHOOK_SECRET ||
    process.env.PLAYFIVER_SECRET_KEY ||
    ''
  ).trim();

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

  if (!isProduction()) {
    const body = req.body ?? {};
    const bodySecret = body.secret_key || body.secretKey;
    const bodyToken = body.agent_token || body.agentToken;
    const expectedToken = (process.env.PLAYFIVER_AGENT_TOKEN || '').trim();

    if (bodySecret === secret) {
      if (!expectedToken || bodyToken === expectedToken) {
        return true;
      }
    }
  }

  return false;
}

export function validateInternalApiSecret(req) {
  const secret = (
    process.env.INTERNAL_API_SECRET ||
    process.env.AVIATOR_INTERNAL_SECRET ||
    ''
  ).trim();
  if (!secret) return false;

  const provided =
    req.headers['x-internal-api-secret'] ||
    req.headers['X-Internal-Api-Secret'];
  return provided === secret;
}

export function createRateLimiter({ windowMs = 60_000, max = 10 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const key = getClientIp(req) || 'unknown';
    const now = Date.now();
    const bucket = hits.get(key) ?? { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    if (bucket.count > max) {
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

function getPublicApiOrigin() {
  const raw = (process.env.PUBLIC_API_URL || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** Lista efetiva: CORS_ORIGINS + origem de PUBLIC_API_URL (Aviator estático em api.*). */
function getAllowedOrigins() {
  const fromEnv = parseCorsOrigins() || [];
  const publicOrigin = getPublicApiOrigin();
  if (!publicOrigin || fromEnv.includes(publicOrigin)) {
    return fromEnv;
  }
  return [...fromEnv, publicOrigin];
}

export function createCorsMiddleware() {
  const allowedOrigins = getAllowedOrigins();

  return (req, res, next) => {
    const origin = req.headers.origin;
    let allowOrigin = '*';

    if (allowedOrigins?.length) {
      if (origin && allowedOrigins.includes(origin)) {
        allowOrigin = origin;
      } else if (!origin) {
        allowOrigin = allowedOrigins[0];
      } else {
        if (req.method === 'OPTIONS') {
          return res.sendStatus(403);
        }
        return res.status(403).json({ ok: false, message: 'Origem não permitida' });
      }
    } else if (origin) {
      if (isProduction()) {
        if (req.method === 'OPTIONS') {
          return res.sendStatus(403);
        }
        return res.status(403).json({ ok: false, message: 'Origem não permitida' });
      }
      allowOrigin = origin;
    }

    res.header('Access-Control-Allow-Origin', allowOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Game-Session'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
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
  ];

  const missing = required.filter(([, value]) => !String(value || '').trim()).map(([name]) => name);

  if (!parseCorsOrigins()?.length) {
    missing.push('CORS_ORIGINS');
  }

  if (missing.length) {
    console.error(`❌ Variáveis obrigatórias em produção: ${missing.join(', ')}`);
    process.exit(1);
  }
}
