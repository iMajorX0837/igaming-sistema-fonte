import { getMisticPayConfigService } from './lib/misticpayConfig.js';
import { enrichPixQrImage } from './lib/pixQrCode.js';

async function getMisticPayRuntime() {
  const config = await getMisticPayConfigService().getConfig();
  const ci = config.ci?.trim();
  const cs = config.cs?.trim();
  if (!ci || !cs) {
    throw new Error('Gateway de pagamento não configurado.');
  }
  return {
    ci,
    cs,
    apiBase: (config.apiUrl || 'https://api.misticpay.com/api').replace(/\/$/, ''),
  };
}

/**
 * @param {Record<string, unknown>} json
 */
function extractTransactionData(json) {
  const data =
    typeof json?.data === 'object' && json.data !== null ? json.data : json;

  const copyPaste = String(data?.copyPaste ?? data?.copy_paste ?? '');
  const qrCodeBase64 = data?.qrCodeBase64 ?? data?.qr_code_base64;
  const qrcodeUrl = data?.qrcodeUrl ?? data?.qrcode_url;
  const rawExtId = data?.transactionId ?? data?.transaction_id;
  const externalTransactionId =
    rawExtId != null && rawExtId !== '' ? String(rawExtId) : undefined;

  return {
    copyPaste,
    qrCodeBase64: typeof qrCodeBase64 === 'string' ? qrCodeBase64 : undefined,
    qrcodeUrl: typeof qrcodeUrl === 'string' ? qrcodeUrl : undefined,
    externalTransactionId,
  };
}

/**
 * @param {{
 *   amount: number;
 *   payerName: string;
 *   payerDocument: string;
 *   transactionId: string;
 *   description: string;
 * }} params
 */
export async function createMisticPayTransaction(params) {
  const { ci, cs, apiBase } = await getMisticPayRuntime();

  const res = await fetch(`${apiBase}/transactions/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ci,
      cs,
    },
    body: JSON.stringify({
      amount: params.amount,
      payerName: params.payerName.trim(),
      payerDocument: params.payerDocument.replace(/\D/g, ''),
      transactionId: params.transactionId,
      description: params.description,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof json?.message === 'string'
        ? json.message
        : `Erro ao criar cobrança (${res.status})`;
    throw new Error(msg);
  }

  const result = extractTransactionData(json);

  if (!result.copyPaste && !result.qrCodeBase64 && !result.qrcodeUrl) {
    throw new Error(
      typeof json?.message === 'string' ? json.message : 'Resposta inválida da API de pagamento.'
    );
  }

  return enrichPixQrImage(result);
}

/**
 * @param {string | number} transactionId
 */
export async function checkMisticPayTransaction(transactionId) {
  const { ci, cs, apiBase } = await getMisticPayRuntime();

  const res = await fetch(`${apiBase}/transactions/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ci,
      cs,
    },
    body: JSON.stringify({
      transactionId,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof json?.message === 'string'
        ? json.message
        : `Erro ao consultar transação (${res.status})`;
    throw new Error(msg);
  }

  const tx =
    (typeof json?.transaction === 'object' && json.transaction !== null
      ? json.transaction
      : null) ??
    (typeof json?.data?.transaction === 'object' && json.data.transaction !== null
      ? json.data.transaction
      : null);

  const transactionState = String(tx?.transactionState ?? tx?.transaction_state ?? '');

  if (!transactionState) {
    throw new Error(
      typeof json?.message === 'string' ? json.message : 'Resposta inválida da consulta de pagamento.'
    );
  }

  const tid = tx?.transactionId ?? tx?.transaction_id;
  return {
    transactionState,
    transactionId: tid != null ? String(tid) : undefined,
  };
}

/**
 * Mapeia tipo de chave PIX do banco para formato MisticPay.
 * @param {string | null | undefined} dbKey
 */
export function mapPixKeyTypeToMisticPay(dbKey) {
  const normalized = String(dbKey ?? '')
    .trim()
    .toLowerCase();

  const map = {
    email: 'EMAIL',
    cpf: 'CPF',
    cnpj: 'CNPJ',
    telefone: 'TELEFONE',
    phone: 'TELEFONE',
    'chave aleatória': 'CHAVE_ALEATORIA',
    'chave aleatoria': 'CHAVE_ALEATORIA',
  };

  return map[normalized] || 'CPF';
}

/**
 * Normaliza chave PIX conforme o tipo (sem formatação para CPF/CNPJ/telefone).
 * @param {string} pixKey
 * @param {string} pixKeyType
 */
export function normalizePixKeyForMisticPay(pixKey, pixKeyType) {
  const raw = String(pixKey ?? '').trim();
  if (!raw) return '';

  if (pixKeyType === 'EMAIL') {
    return raw.toLowerCase();
  }

  if (pixKeyType === 'CHAVE_ALEATORIA') {
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
 *   projectWebhook?: string;
 * }} params
 */
export async function createMisticPayWithdraw(params) {
  const { ci, cs, apiBase } = await getMisticPayRuntime();

  const pixKeyType = mapPixKeyTypeToMisticPay(params.pixKeyType);
  const pixKey = normalizePixKeyForMisticPay(params.pixKey, pixKeyType);

  if (!pixKey) {
    throw new Error('Chave PIX inválida para o saque.');
  }

  const body = {
    amount: Number(params.amount),
    pixKey,
    pixKeyType,
    description: params.description,
  };

  if (params.projectWebhook) {
    body.projectWebhook = params.projectWebhook;
  }

  const res = await fetch(`${apiBase}/transactions/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ci,
      cs,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof json?.message === 'string'
        ? json.message
        : `Erro ao solicitar saque PIX (${res.status})`;
    throw new Error(msg);
  }

  const data =
    typeof json?.data === 'object' && json.data !== null ? json.data : json;

  const jobId = data?.jobId ?? data?.job_id;
  const transactionId = data?.transactionId ?? data?.transaction_id;
  const status = data?.status ?? data?.transactionState ?? data?.transaction_state;

  if (jobId == null && transactionId == null) {
    throw new Error(
      typeof json?.message === 'string' ? json.message : 'Resposta inválida da API de saque.'
    );
  }

  return {
    jobId: jobId != null ? String(jobId) : undefined,
    transactionId: transactionId != null ? String(transactionId) : undefined,
    status: status != null ? String(status) : 'QUEUED',
    message:
      typeof data?.message === 'string'
        ? data.message
        : typeof json?.message === 'string'
          ? json.message
          : undefined,
  };
}

export async function getMisticPayWebhookSecret() {
  const config = await getMisticPayConfigService().getConfig();
  return config.webhookSecret?.trim() || '';
}
