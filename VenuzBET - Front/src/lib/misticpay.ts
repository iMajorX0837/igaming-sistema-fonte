import { supabase } from './supabase';

function getDepositApiBasePath(): string {
  const fromEnv = import.meta.env.VITE_DEPOSIT_API_BASE?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '/api/deposit';
  }
  throw new Error(
    'Defina VITE_DEPOSIT_API_BASE no .env (ex.: /api/deposit) para usar o proxy de depósitos.'
  );
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Faça login para depositar.');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface CreateMisticPayTransactionParams {
  amount: number;
  payerName?: string;
  payerDocument?: string;
  transactionId?: string;
  description?: string;
  cupom_codigo?: string | null;
}

export interface MisticPayTransactionResult {
  copyPaste: string;
  qrCodeBase64?: string;
  qrcodeUrl?: string;
  externalTransactionId?: string;
  checkTransactionId?: string;
  depositoId?: string | null;
  amount?: number;
}

export interface MisticPayCheckTransactionResult {
  transactionState: string;
  transactionId?: string;
  paid?: boolean;
  confirmError?: string | null;
  vip?: {
    ok?: boolean;
    subiu_nivel?: boolean;
    vip_nome?: string;
    bonus_upgrade?: number;
  } | null;
  cupomBonus?: {
    codigo: string;
    valor: number;
  } | null;
}

export async function createMisticPayTransaction(
  params: CreateMisticPayTransactionParams
): Promise<MisticPayTransactionResult> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getDepositApiBasePath()}/pix/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: params.amount,
      cupom_codigo: params.cupom_codigo ?? null,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || json.ok === false) {
    const msg =
      typeof json?.message === 'string'
        ? json.message
        : `Erro ao criar cobrança (${res.status})`;
    throw new Error(msg);
  }

  const copyPaste = String(json.copyPaste ?? '');
  const qrCodeBase64 = json.qrCodeBase64;
  const qrcodeUrl = json.qrcodeUrl;
  const externalTransactionId =
    json.externalTransactionId != null ? String(json.externalTransactionId) : undefined;
  const checkTransactionId =
    json.checkTransactionId != null ? String(json.checkTransactionId) : externalTransactionId;

  if (!copyPaste && !qrCodeBase64 && !qrcodeUrl) {
    throw new Error(
      typeof json?.message === 'string' ? json.message : 'Resposta inválida da API de pagamento.'
    );
  }

  return {
    copyPaste,
    qrCodeBase64: typeof qrCodeBase64 === 'string' ? qrCodeBase64 : undefined,
    qrcodeUrl: typeof qrcodeUrl === 'string' ? qrcodeUrl : undefined,
    externalTransactionId,
    checkTransactionId,
    depositoId: typeof json.depositoId === 'string' ? json.depositoId : null,
    amount: typeof json.amount === 'number' ? json.amount : params.amount,
  };
}

export async function checkMisticPayTransaction(
  transactionId: string | number,
  options?: { depositoId?: string | null; cupom_codigo?: string | null }
): Promise<MisticPayCheckTransactionResult> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getDepositApiBasePath()}/pix/check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      checkTransactionId: transactionId,
      depositoId: options?.depositoId ?? null,
      cupom_codigo: options?.cupom_codigo ?? null,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || json.ok === false) {
    const msg =
      typeof json?.message === 'string'
        ? json.message
        : `Erro ao consultar transação (${res.status})`;
    throw new Error(msg);
  }

  const transactionState = String(json.transactionState ?? '');

  if (!transactionState) {
    throw new Error(
      typeof json?.message === 'string' ? json.message : 'Resposta inválida da consulta de pagamento.'
    );
  }

  const vip = (typeof json.vip === 'object' && json.vip !== null
    ? json.vip
    : null) as MisticPayCheckTransactionResult['vip'];

  const cupomBonus = (typeof json.cupomBonus === 'object' && json.cupomBonus !== null
    ? json.cupomBonus
    : null) as MisticPayCheckTransactionResult['cupomBonus'];

  return {
    transactionState,
    paid: Boolean(json.paid),
    confirmError: typeof json.confirmError === 'string' ? json.confirmError : null,
    vip,
    cupomBonus,
  };
}
