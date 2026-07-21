import crypto from 'node:crypto';
import { getBspayConfigService } from './lib/bspayConfig.js';
import { extractPixPaymentFields, enrichPixQrImage } from './lib/pixQrCode.js';

/** @type {{ token: string | null, expiresAt: number }} */
let tokenCache = { token: null, expiresAt: 0 };

async function getBspayRuntime() {
  const config = await getBspayConfigService().getConfig();
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();
  const signingKey = config.signingKey?.trim();

  if (!clientId || !clientSecret || !signingKey) {
    throw new Error('Gateway de pagamento não configurado.');
  }

  return {
    clientId,
    clientSecret,
    signingKey,
    apiUrl: (config.apiUrl || 'https://api.bspay.co').replace(/\/$/, ''),
  };
}

/**
 * @param {{ clientId: string; clientSecret: string; apiUrl: string }} runtime
 */
async function getAccessToken(runtime) {
  const now = Date.now();
  if (tokenCache.token && now < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const auth = Buffer.from(`${runtime.clientId}:${runtime.clientSecret}`).toString('base64');
  const res = await fetch(`${runtime.apiUrl}/v2/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof json?.error?.message === 'string'
        ? json.error.message
        : typeof json?.message === 'string'
          ? json.message
          : `Erro ao autenticar na BSPay (${res.status})`;
    throw new Error(msg);
  }

  const token = json?.access_token;
  if (!token) {
    throw new Error('Resposta inválida ao autenticar na BSPay.');
  }

  tokenCache = {
    token,
    expiresAt: now + (Number(json?.expires_in) || 3600) * 1000,
  };

  return token;
}

/**
 * @param {string} signingKey
 * @param {string} body
 */
function buildHmacHeaders(signingKey, body) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(`${timestamp}.${nonce}.${body}`)
    .digest('hex');

  return {
    'X-Signature': signature,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
  };
}

/**
 * @param {Record<string, unknown>} json
 */
function extractBspayError(json, fallback) {
  if (typeof json?.error?.message === 'string') return json.error.message;
  if (typeof json?.message === 'string') return json.message;
  return fallback;
}

/**
 * @param {{
 *   amount: number;
 *   payerName: string;
 *   payerDocument: string;
 *   transactionId: string;
 *   description: string;
 *   postbackUrl?: string;
 * }} params
 */
export async function createBspayTransaction(params) {
  const runtime = await getBspayRuntime();
  const token = await getAccessToken(runtime);

  const body = {
    amount: params.amount,
    currency: 'BRL',
    external_id: params.transactionId,
    payer: {
      name: params.payerName.trim(),
      document: params.payerDocument.replace(/\D/g, ''),
    },
  };

  if (params.postbackUrl) {
    body.postback_url = params.postbackUrl;
  }

  const res = await fetch(`${runtime.apiUrl}/v2/transactions/cashin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.success === false) {
    throw new Error(extractBspayError(json, `Erro ao criar cobrança BSPay (${res.status})`));
  }

  const data = typeof json?.data === 'object' && json.data !== null ? json.data : json;
  const pixFields = extractPixPaymentFields(json);
  const copyPaste = pixFields.copyPaste ?? '';
  const externalTransactionId =
    data?.transaction_id != null ? String(data.transaction_id) : params.transactionId;

  if (!copyPaste && !pixFields.qrCodeBase64 && !pixFields.qrcodeUrl) {
    throw new Error(extractBspayError(json, 'Resposta inválida da API de pagamento.'));
  }

  return enrichPixQrImage({
    copyPaste,
    qrCodeBase64: pixFields.qrCodeBase64,
    qrcodeUrl: pixFields.qrcodeUrl,
    externalTransactionId,
  });
}

/**
 * @param {string | number} transactionId
 */
export async function checkBspayTransaction(transactionId) {
  const runtime = await getBspayRuntime();
  const token = await getAccessToken(runtime);

  const res = await fetch(`${runtime.apiUrl}/v2/account/transactions/list`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transaction_id: String(transactionId),
      page: 1,
      page_size: 1,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.success === false) {
    throw new Error(extractBspayError(json, `Erro ao consultar transação BSPay (${res.status})`));
  }

  const items = Array.isArray(json?.data?.items) ? json.data.items : [];
  const tx = items[0];

  if (!tx) {
    return {
      transactionState: 'PENDENTE',
      transactionId: String(transactionId),
    };
  }

  const status = String(tx?.status ?? '').toLowerCase();
  let transactionState = 'PENDENTE';

  if (status === 'confirmed' || status === 'paid') {
    transactionState = 'COMPLETO';
  } else if (status === 'cancelled' || status === 'failed' || status === 'expired') {
    transactionState = status.toUpperCase();
  }

  return {
    transactionState,
    transactionId: tx?.transaction_id != null ? String(tx.transaction_id) : String(transactionId),
  };
}

/**
 * @param {string | null | undefined} dbKey
 */
export function mapPixKeyTypeToBspay(dbKey) {
  const normalized = String(dbKey ?? '')
    .trim()
    .toLowerCase();

  const map = {
    email: 'email',
    cpf: 'cpf',
    cnpj: 'cnpj',
    telefone: 'phone',
    phone: 'phone',
    'chave aleatória': 'random',
    'chave aleatoria': 'random',
  };

  return map[normalized] || 'cpf';
}

/**
 * @param {string} pixKey
 * @param {string} pixKeyType
 */
export function normalizePixKeyForBspay(pixKey, pixKeyType) {
  const raw = String(pixKey ?? '').trim();
  if (!raw) return '';

  if (pixKeyType === 'email') {
    return raw.toLowerCase();
  }

  if (pixKeyType === 'random') {
    return raw;
  }

  return raw.replace(/\D/g, '');
}

/**
 * @param {{
 *   amount: number;
 *   pixKey: string;
 *   pixKeyType: string;
 *   description: string;
 *   externalId: string;
 *   postbackUrl?: string;
 * }} params
 */
export async function createBspayWithdraw(params) {
  const runtime = await getBspayRuntime();
  const token = await getAccessToken(runtime);

  const keyType = mapPixKeyTypeToBspay(params.pixKeyType);
  const key = normalizePixKeyForBspay(params.pixKey, keyType);

  if (!key) {
    throw new Error('Chave PIX inválida para o saque.');
  }

  const payload = {
    external_id: params.externalId,
    amount: Number(params.amount),
    currency: 'BRL',
    key,
    key_type: keyType,
    description: params.description,
  };

  if (params.postbackUrl) {
    payload.postback_url = params.postbackUrl;
  }

  const body = JSON.stringify(payload);
  const hmacHeaders = buildHmacHeaders(runtime.signingKey, body);

  const res = await fetch(`${runtime.apiUrl}/v2/transactions/cashout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...hmacHeaders,
    },
    body,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.success === false) {
    throw new Error(extractBspayError(json, `Erro ao solicitar saque PIX (${res.status})`));
  }

  const data = typeof json?.data === 'object' && json.data !== null ? json.data : json;
  const transactionId = data?.transaction_id;

  if (transactionId == null) {
    throw new Error(extractBspayError(json, 'Resposta inválida da API de saque.'));
  }

  const status = String(data?.status ?? json?.message ?? 'pending').toUpperCase();

  return {
    jobId: undefined,
    transactionId: String(transactionId),
    status: status === 'PENDING' ? 'QUEUED' : status,
    message: typeof json?.message === 'string' ? json.message : undefined,
  };
}

export async function getBspayWebhookSecret() {
  const config = await getBspayConfigService().getConfig();
  return config.webhookSecret?.trim() || '';
}

/**
 * Valida webhook BSPay (HMAC SHA256 sobre raw body).
 * @param {{ rawBody: string; headers: Record<string, string | string[] | undefined>; secret: string }} params
 */
export function validateBspayWebhookSignature({ rawBody, headers, secret }) {
  if (!secret) return false;

  const sig = String(headers['x-webhook-signature'] ?? '');
  const ts = parseInt(String(headers['x-webhook-timestamp'] ?? ''), 10);

  if (!sig || !Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
