import crypto from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import {
  parseCookies,
  ADMIN_ELEVATION,
  ADMIN_SESSION_TEST_MAX_AGE_SEC,
  setAdminElevationCookie,
  clearAdminElevationCookie,
} from './authCookies.js';

const ISSUER = 'VenuzBET Admin';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
/** Sessão elevada (2FA ok no painel) — acompanha sessão admin (refresh token). */
const ELEVATION_TTL_MS =
  ADMIN_SESSION_TEST_MAX_AGE_SEC > 0
    ? ADMIN_SESSION_TEST_MAX_AGE_SEC * 1000
    : 60 * 60 * 24 * 30 * 1000;
const USER_ELEV_PREFIX = 'u.';

/** @type {Map<string, { session: object; expires: number }>} */
const pendingChallenges = new Map();

/** @type {Map<string, number>} tokenHash -> expiresAt */
const elevatedAdminTokens = new Map();

function cleanupChallenges() {
  const now = Date.now();
  for (const [id, entry] of pendingChallenges.entries()) {
    if (entry.expires <= now) {
      pendingChallenges.delete(id);
    }
  }
}

function cleanupElevations() {
  const now = Date.now();
  for (const [hash, expires] of elevatedAdminTokens.entries()) {
    if (expires <= now) {
      elevatedAdminTokens.delete(hash);
    }
  }
}

function hashToken(accessToken) {
  return crypto.createHash('sha256').update(String(accessToken)).digest('hex');
}

function getElevationSecret() {
  const secret = String(process.env.INTERNAL_API_SECRET || '').trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') {
    return String(process.env.SUPABASE_SERVICE_KEY || 'dev-admin-elevation-fallback').trim();
  }
  return '';
}

function signElevation(tokenHash, expSec) {
  const secret = getElevationSecret();
  if (!secret) return null;
  const payload = `${tokenHash}.${expSec}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function signUserElevation(userId, expSec) {
  const secret = getElevationSecret();
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(`${userId}.${expSec}`).digest('hex');
}

function verifyElevationCookie(req, tokenHash) {
  if (!req) return null;

  const raw = parseCookies(req)[ADMIN_ELEVATION];
  if (!raw || typeof raw !== 'string' || raw.startsWith(USER_ELEV_PREFIX)) return null;

  const parts = raw.split('.');
  if (parts.length !== 2) return null;

  const expSec = Number(parts[0]);
  const sig = parts[1];
  if (!Number.isFinite(expSec) || !sig) return null;
  if (expSec <= Math.floor(Date.now() / 1000)) return null;

  const expected = signElevation(tokenHash, expSec);
  if (!expected) return null;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return expSec * 1000;
}

function verifyUserElevationCookie(req, userId) {
  if (!req || !userId) return null;

  const raw = parseCookies(req)[ADMIN_ELEVATION];
  if (!raw || typeof raw !== 'string' || !raw.startsWith(USER_ELEV_PREFIX)) return null;

  const rest = raw.slice(USER_ELEV_PREFIX.length);
  const parts = rest.split('.');
  if (parts.length < 3) return null;

  const sig = parts[parts.length - 1];
  const expSec = Number(parts[parts.length - 2]);
  const cookieUserId = parts.slice(0, -2).join('.');

  if (cookieUserId !== userId || !Number.isFinite(expSec) || !sig) return null;
  if (expSec <= Math.floor(Date.now() / 1000)) return null;

  const expected = signUserElevation(userId, expSec);
  if (!expected) return null;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return expSec * 1000;
}

function persistElevationCookie(res, accessToken, ttlMs) {
  if (!res || !accessToken) return;

  const tokenHash = hashToken(accessToken);
  const expSec = Math.floor((Date.now() + ttlMs) / 1000);
  const sig = signElevation(tokenHash, expSec);
  if (!sig) return;

  setAdminElevationCookie(res, `${expSec}.${sig}`, Math.max(60, Math.ceil(ttlMs / 1000)));
}

function persistUserElevationCookie(res, userId, ttlMs) {
  if (!res || !userId) return;

  const expSec = Math.floor((Date.now() + ttlMs) / 1000);
  const sig = signUserElevation(userId, expSec);
  if (!sig) return;

  setAdminElevationCookie(
    res,
    `${USER_ELEV_PREFIX}${userId}.${expSec}.${sig}`,
    Math.max(60, Math.ceil(ttlMs / 1000))
  );
}

export function generateTotpSecret() {
  return generateSecret();
}

export function buildOtpAuthUrl(email, secret) {
  return generateURI({
    issuer: ISSUER,
    label: email ?? 'admin',
    secret,
  });
}

export async function buildQrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 256 });
}

export async function verifyTotpCode(secret, code) {
  if (!secret || !code) return false;
  const normalized = String(code).replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  try {
    const result = await verify({ secret, token: normalized });
    return result.valid;
  } catch {
    return false;
  }
}

export function create2FAChallenge(session) {
  cleanupChallenges();
  const challengeToken = crypto.randomUUID();
  pendingChallenges.set(challengeToken, {
    session,
    expires: Date.now() + CHALLENGE_TTL_MS,
  });
  return challengeToken;
}

export function get2FAChallenge(challengeToken) {
  cleanupChallenges();
  const entry = pendingChallenges.get(challengeToken);
  if (!entry || entry.expires <= Date.now()) {
    pendingChallenges.delete(challengeToken);
    return null;
  }
  return entry.session;
}

export function consume2FAChallenge(challengeToken) {
  const session = get2FAChallenge(challengeToken);
  if (session) {
    pendingChallenges.delete(challengeToken);
  }
  return session;
}

/**
 * Marca sessão admin como elevada (2FA confirmado no painel).
 * @param {string | null | undefined} accessToken
 * @param {number} [ttlMs]
 * @param {import('express').Response | null} [res]
 * @param {string | null | undefined} [userId] — cookie de elevação por usuário (sobrevive refresh do JWT)
 */
export function markAdminSessionElevated(accessToken, ttlMs = ELEVATION_TTL_MS, res = null, userId = null) {
  cleanupElevations();

  if (userId) {
    persistUserElevationCookie(res, userId, ttlMs);
    if (accessToken) {
      elevatedAdminTokens.set(hashToken(accessToken), Date.now() + ttlMs);
    }
    return;
  }

  if (accessToken) {
    elevatedAdminTokens.set(hashToken(accessToken), Date.now() + ttlMs);
    persistElevationCookie(res, accessToken, ttlMs);
  }
}

/**
 * @param {string | null | undefined} accessToken
 * @param {import('express').Request | null} [req]
 * @param {string | null | undefined} [userId]
 */
export function isAdminSessionElevated(accessToken, req = null, userId = null) {
  if (!accessToken && !userId) return false;
  cleanupElevations();

  if (userId && req) {
    const userExpires = verifyUserElevationCookie(req, userId);
    if (userExpires && userExpires > Date.now()) {
      if (accessToken) {
        elevatedAdminTokens.set(hashToken(accessToken), userExpires);
      }
      return true;
    }
  }

  if (!accessToken) return false;

  const tokenHash = hashToken(accessToken);
  const expires = elevatedAdminTokens.get(tokenHash);
  if (expires) {
    if (expires <= Date.now()) {
      elevatedAdminTokens.delete(tokenHash);
    } else {
      return true;
    }
  }

  const cookieExpires = verifyElevationCookie(req, tokenHash);
  if (!cookieExpires || cookieExpires <= Date.now()) {
    return false;
  }

  elevatedAdminTokens.set(tokenHash, cookieExpires);
  return true;
}

/** Remove elevação (logout). */
export function revokeAdminSessionElevation(accessToken, res = null) {
  if (accessToken) {
    elevatedAdminTokens.delete(hashToken(accessToken));
  }
  if (res) {
    clearAdminElevationCookie(res);
  }
}

/** Ao renovar JWT, preserva elevação se a sessão antiga era elevada. */
export function transferAdminSessionElevation(
  oldAccessToken,
  newAccessToken,
  req = null,
  res = null,
  ttlMs = ELEVATION_TTL_MS,
  userId = null
) {
  if (!newAccessToken) return;

  const wasElevated = userId
    ? isAdminSessionElevated(oldAccessToken, req, userId)
    : isAdminSessionElevated(oldAccessToken, req);

  if (!wasElevated) return;
  markAdminSessionElevated(newAccessToken, ttlMs, res, userId);
}
