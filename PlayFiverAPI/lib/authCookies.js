import { isProduction } from './security.js';

const USER_ACCESS = 'venuz_at';
const USER_REFRESH = 'venuz_rt';
const ADMIN_ACCESS = 'venuz_admin_at';
const ADMIN_REFRESH = 'venuz_admin_rt';
/** Sessão admin elevada (2FA ok) — sobrevive restart da API. */
export const ADMIN_ELEVATION = 'venuz_admin_elev';
/** M9: sessão do jogo Aviator — HttpOnly, nunca na query string. */
export const AVIATOR_GAME_SESSION = 'venuz_gs';
const AVIATOR_GS_MAX_AGE_SEC = 86_400;

const REFRESH_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function cookieNames(scope) {
  if (scope === 'admin') {
    return { access: ADMIN_ACCESS, refresh: ADMIN_REFRESH };
  }
  return { access: USER_ACCESS, refresh: USER_REFRESH };
}

export function isAdminClient(req) {
  return req.headers['x-client-info'] === 'admin-panel';
}

export function resolveAuthScope(req, { preferAdmin = false } = {}) {
  if (preferAdmin || isAdminClient(req)) return 'admin';
  return 'user';
}

export function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header || typeof header !== 'string') return {};

  const out = {};
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1);
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

function buildCookie(name, value, maxAgeSec) {
  const secure = isProduction();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function buildClearCookie(name) {
  const secure = isProduction();
  const parts = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function accessMaxAge(session) {
  if (session?.expires_in && Number.isFinite(session.expires_in)) {
    return Math.max(60, Number(session.expires_in));
  }
  if (session?.expires_at) {
    return Math.max(60, session.expires_at - Math.floor(Date.now() / 1000));
  }
  return 3600;
}

export function setAuthCookies(res, req, session) {
  if (!session?.access_token) return;

  const scope = resolveAuthScope(req);
  const names = cookieNames(scope);
  const cookies = [buildCookie(names.access, session.access_token, accessMaxAge(session))];

  if (session.refresh_token) {
    cookies.push(buildCookie(names.refresh, session.refresh_token, REFRESH_MAX_AGE_SEC));
  }

  res.setHeader('Set-Cookie', cookies);
}

export function clearAuthCookies(res, req, { both = false } = {}) {
  const scopes = both ? ['user', 'admin'] : [resolveAuthScope(req)];
  const cookies = [];

  for (const scope of scopes) {
    const names = cookieNames(scope);
    cookies.push(buildClearCookie(names.access));
    cookies.push(buildClearCookie(names.refresh));
    if (scope === 'admin') {
      cookies.push(buildClearCookie(ADMIN_ELEVATION));
    }
  }

  res.setHeader('Set-Cookie', cookies);
}

/** Tokens de acesso presentes nos cookies (user + admin) — logout deve invalidar todos. */
export function collectStoredAccessTokens(req) {
  const cookies = parseCookies(req);
  const tokens = new Set();

  for (const name of [USER_ACCESS, ADMIN_ACCESS]) {
    const value = cookies[name];
    if (typeof value === 'string' && value.trim()) {
      tokens.add(value.trim());
    }
  }

  return [...tokens];
}

export function setAdminElevationCookie(res, value, maxAgeSec) {
  if (!value) return;
  const cookie = buildCookie(ADMIN_ELEVATION, value, maxAgeSec);
  const existing = res.getHeader('Set-Cookie');
  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else if (existing) {
    res.setHeader('Set-Cookie', [existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

export function clearAdminElevationCookie(res) {
  const cookie = buildClearCookie(ADMIN_ELEVATION);
  const existing = res.getHeader('Set-Cookie');
  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else if (existing) {
    res.setHeader('Set-Cookie', [existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

export function extractAccessToken(req, options = {}) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookies = parseCookies(req);
  const preferAdmin = options.preferAdmin === true;
  const scope = resolveAuthScope(req, { preferAdmin });

  if (scope === 'admin') {
    return cookies[ADMIN_ACCESS] || null;
  }

  return cookies[USER_ACCESS] || null;
}

export function extractRefreshToken(req, options = {}) {
  const fromBody = req.body?.refresh_token;
  if (typeof fromBody === 'string' && fromBody.trim()) {
    return fromBody.trim();
  }

  const cookies = parseCookies(req);
  const preferAdmin = options.preferAdmin === true;
  const scope = resolveAuthScope(req, { preferAdmin });

  if (scope === 'admin') {
    return cookies[ADMIN_REFRESH] || null;
  }

  return cookies[USER_REFRESH] || null;
}

export function sanitizeSessionForClient(session) {
  if (!session) return null;
  return {
    user: session.user ?? null,
    expires_at: session.expires_at ?? null,
  };
}

export function sanitizeAuthPayload(data) {
  if (!data || typeof data !== 'object') return data;

  const next = { ...data };
  if ('session' in next) {
    next.session = sanitizeSessionForClient(next.session);
  }
  return next;
}

export function setAviatorGameSessionCookie(res, token) {
  if (!token) return;
  const cookie = buildCookie(AVIATOR_GAME_SESSION, token, AVIATOR_GS_MAX_AGE_SEC);
  const existing = res.getHeader('Set-Cookie');
  if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookie]);
  } else if (existing) {
    res.setHeader('Set-Cookie', [existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

export function getAviatorGameSessionCookie(req) {
  return parseCookies(req)[AVIATOR_GAME_SESSION] || '';
}
