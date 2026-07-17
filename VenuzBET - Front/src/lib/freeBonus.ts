import { PLAYFIVER_AGENT_TOKEN, PLAYFIVER_SECRET_KEY } from '../config/playfiversCredentials';

export interface FreeBonusItem {
  id: number;
  game_id: string;
  game_name: string;
  player_id: string;
  rounds: number;
  total_rounds: number;
  status: string;
  created_at: string;
}

export interface GrantFreeBonusResult {
  ok: boolean;
  msg?: string;
}

interface FreeBonusGrantResponse {
  status?: number | boolean;
  msg?: string;
  message?: string;
}

interface FreeBonusListResponse {
  status?: boolean;
  msg?: string;
  data?: FreeBonusItem[];
}

export async function listFreeBonuses(userCode: string): Promise<FreeBonusItem[]> {
  const baseUrl = import.meta.env.VITE_FREE_BONUS_URL?.trim() || '/api/free_bonus';
  const url = `${baseUrl}?user_code=${encodeURIComponent(userCode)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  let data: FreeBonusListResponse | null = null;
  try {
    data = (await response.json()) as FreeBonusListResponse;
  } catch {
    data = null;
  }

  if (!response.ok || data?.status === false) {
    console.error('listFreeBonuses:', data?.msg || response.status);
    return [];
  }

  return Array.isArray(data?.data) ? data.data : [];
}

export async function grantPrizeWheelBonus(params: {
  userCode: string;
  gameCode: string;
  rounds: number;
}): Promise<GrantFreeBonusResult> {
  return grantFreeBonus(params);
}

export async function grantFreeBonus(params: {
  userCode: string;
  gameCode: string;
  rounds: number;
}): Promise<GrantFreeBonusResult> {
  const url = import.meta.env.VITE_FREE_BONUS_URL?.trim() || '/api/free_bonus';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_token: PLAYFIVER_AGENT_TOKEN,
      secret_key: PLAYFIVER_SECRET_KEY,
      user_code: params.userCode,
      game_code: params.gameCode,
      rounds: params.rounds,
    }),
  });

  let data: FreeBonusGrantResponse | null = null;
  try {
    data = (await response.json()) as FreeBonusGrantResponse;
  } catch {
    data = null;
  }

  const msg = data?.msg || data?.message;

  if (!response.ok) {
    return { ok: false, msg: msg || `Erro ao ativar rodadas (${response.status})` };
  }

  if (data?.status === 0 || data?.status === false) {
    return { ok: false, msg: msg || 'Não foi possível ativar as rodadas grátis.' };
  }

  return { ok: true, msg };
}

export function getFreeBonusStatusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'pending') return 'Disponível';
  if (normalized === 'completed' || normalized === 'used') return 'Finalizado';
  if (normalized === 'active') return 'Em uso';
  return status;
}

export function getFreeBonusStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'pending') return 'bg-emerald-500/20 text-emerald-300';
  if (normalized === 'active') return 'bg-brand/20 text-brand-light';
  if (normalized === 'completed' || normalized === 'used') return 'bg-slate-500/20 text-slate-400';
  return 'bg-amber-500/20 text-amber-300';
}
