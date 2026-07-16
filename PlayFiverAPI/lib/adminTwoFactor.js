import crypto from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

const ISSUER = 'VenuzBET Admin';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { session: object; expires: number }>} */
const pendingChallenges = new Map();

function cleanupChallenges() {
  const now = Date.now();
  for (const [id, entry] of pendingChallenges.entries()) {
    if (entry.expires <= now) {
      pendingChallenges.delete(id);
    }
  }
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
