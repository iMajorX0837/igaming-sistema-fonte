import crypto from 'node:crypto';
import { getVeopagConfigService } from './lib/veopagConfig.js';
import { extractPixPaymentFields, enrichPixQrImage } from './lib/pixQrCode.js';

/** @type {{ token: string | null, expiresAt: number }} */
let tokenCache = { token: null, expiresAt: 0 };

async function getVeopagRuntime() {
  const config = await getVeopagConfigService().getConfig();
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('Gateway de pagamento não configurado.');
  }

  return {
    clientId,
    clientSecret,
    apiUrl: (config.apiUrl || 'https://api.veopag.com').replace(/\/$/, ''),
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

  const res = await fetch(`${runtime.apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: runtime.clientId,
      client_secret: runtime.clientSecret,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof json?.message === 'string'
        ? json.message
        : `Erro ao autenticar na VeoPag (${res.status})`;
    throw new Error(msg);
  }

  const token = json?.token;
  if (!token) {
    throw new Error('Resposta inválida ao autenticar na VeoPag.');
  }

  tokenCache = {
    token,
    expiresAt: now + 55 * 60 * 1000,
  };

  return token;
}

/**
 * @param {Record<string, unknown>} json
 */
function extractVeopagError(json, fallback) {
  if (typeof json?.message === 'string') return json.message;
  if (typeof json?.error === 'string') return json.error;
  return fallback;
}

/**
 * @param {{
 *   amount: number;
 *   payerName: string;
 *   payerDocument: string;
 *   payerEmail: string;
 *   transactionId: string;
 *   description: string;
 *   postbackUrl?: string;
 * }} params
 */
export async function createVeopagTransaction(params) {
  const runtime = await getVeopagRuntime();
  const token = await getAccessToken(runtime);

  const body = {
    amount: params.amount,
    external_id: params.transactionId,
    payer: {
      name: params.payerName.trim(),
      email: params.payerEmail.trim(),
      document: params.payerDocument.replace(/\D/g, ''),
    },
  };

  if (params.postbackUrl) {
    body.clientCallbackUrl = params.postbackUrl;
  }

  const res = await fetch(`${runtime.apiUrl}/api/payments/deposit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(extractVeopagError(json, `Erro ao criar cobrança VeoPag (${res.status})`));
  }

  const pixFields = extractPixPaymentFields(json);
  const copyPaste = pixFields.copyPaste ?? '';
  const qr = json?.qrCodeResponse;
  const externalTransactionId =
    qr?.transactionId != null
      ? String(qr.transactionId)
      : json?.transaction_id != null
        ? String(json.transaction_id)
        : params.transactionId;

  if (!copyPaste && !pixFields.qrCodeBase64 && !pixFields.qrcodeUrl) {
    throw new Error(extractVeopagError(json, 'Resposta inválida da API de pagamento.'));
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
export async function checkVeopagTransaction(transactionId) {
  const runtime = await getVeopagRuntime();
  const token = await getAccessToken(runtime);
  const id = String(transactionId);

  const tryQuery = async (param, value) => {
    const url = new URL(`${runtime.apiUrl}/api/transactions/deposit`);
    url.searchParams.set(param, value);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(extractVeopagError(json, `Erro ao consultar transação VeoPag (${res.status})`));
    }

    return json?.deposit ?? null;
  };

  let deposit = await tryQuery('transaction_id', id).catch(() => null);
  if (!deposit) {
    deposit = await tryQuery('external_id', id).catch(() => null);
  }

  if (!deposit) {
    return {
      transactionState: 'PENDENTE',
      transactionId: id,
    };
  }

  const status = String(deposit?.status ?? '').toUpperCase();
  let transactionState = 'PENDENTE';

  if (status === 'COMPLETED') {
    transactionState = 'COMPLETO';
  } else if (status === 'FAILED') {
    transactionState = 'FAILED';
  }

  return {
    transactionState,
    transactionId:
      deposit?.transaction_id != null ? String(deposit.transaction_id) : id,
  };
}

/**
 * @param {string | null | undefined} dbKey
 */
export function mapPixKeyTypeToVeopag(dbKey) {
  const normalized = String(dbKey ?? '')
    .trim()
    .toLowerCase();

  const map = {
    email: 'EMAIL',
    cpf: 'CPF',
    cnpj: 'CNPJ',
    telefone: 'PHONE',
    phone: 'PHONE',
    'chave aleatória': 'EVP',
    'chave aleatoria': 'EVP',
  };

  return map[normalized] || 'CPF';
}

/**
 * @param {string} pixKey
 * @param {string} pixKeyType
 */
export function normalizePixKeyForVeopag(pixKey, pixKeyType) {
  const raw = String(pixKey ?? '').trim();
  if (!raw) return '';

  if (pixKeyType === 'EMAIL') {
    return raw.toLowerCase();
  }

  if (pixKeyType === 'EVP') {
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
 *   receiverName?: string;
 *   receiverDocument?: string;
 *   postbackUrl?: string;
 * }} params
 */
export async function createVeopagWithdraw(params) {
  const runtime = await getVeopagRuntime();
  const token = await getAccessToken(runtime);

  const keyType = mapPixKeyTypeToVeopag(params.pixKeyType);
  const pixKey = normalizePixKeyForVeopag(params.pixKey, keyType);

  if (!pixKey) {
    throw new Error('Chave PIX inválida para o saque.');
  }

  const body = {
    amount: Number(params.amount),
    external_id: params.externalId,
    pix_key: pixKey,
    key_type: keyType,
    description: params.description,
  };

  if (params.receiverName?.trim()) {
    body.name = params.receiverName.trim();
  }

  const receiverDoc = params.receiverDocument?.replace(/\D/g, '') ?? '';
  if (['EMAIL', 'PHONE', 'EVP'].includes(keyType)) {
    if (!receiverDoc) {
      throw new Error('CPF/CNPJ do recebedor é obrigatório para este tipo de chave PIX.');
    }
    body.taxId = receiverDoc;
  }

  if (params.postbackUrl) {
    body.clientCallbackUrl = params.postbackUrl;
  }

  const res = await fetch(`${runtime.apiUrl}/api/withdrawals/withdraw`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(extractVeopagError(json, `Erro ao solicitar saque PIX (${res.status})`));
  }

  const data =
    typeof json?.withdrawal === 'object' && json.withdrawal !== null
      ? json.withdrawal
      : typeof json?.data === 'object' && json.data !== null
        ? json.data
        : json;

  const transactionId =
    data?.transaction_id ?? data?.transactionId ?? json?.transaction_id ?? json?.transactionId;

  if (transactionId == null) {
    throw new Error(extractVeopagError(json, 'Resposta inválida da API de saque.'));
  }

  const status = String(data?.status ?? json?.status ?? 'PENDING').toUpperCase();

  return {
    jobId: undefined,
    transactionId: String(transactionId),
    status: status === 'PENDING' || status === 'QUEUE' ? 'QUEUED' : status,
    message: typeof json?.message === 'string' ? json.message : undefined,
  };
}

export async function getVeopagWebhookSecret() {
  const config = await getVeopagConfigService().getConfig();
  return config.webhookSecret?.trim() || '';
}

/**
 * VeoPag assina: HMAC_SHA256(secret, `${timestamp}.${rawBody}`)
 * @param {{ rawBody: string; headers: Record<string, string | string[] | undefined>; secret: string }} params
 */
export function validateVeopagWebhookSignature({ rawBody, headers, secret }) {
  if (!secret) return false;

  const sig = String(headers['x-webhook-signature'] ?? '');
  const ts = String(headers['x-webhook-timestamp'] ?? '');

  if (!sig || !ts) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300) return false;

  const expected = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
