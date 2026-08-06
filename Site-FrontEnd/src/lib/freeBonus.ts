import { getAppCopy } from '../i18n';
import type { AppLanguage } from '../i18n/types';
import { supabase } from './supabase';

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

async function ensureAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session?.user;
}

export async function listFreeBonuses(userCode: string): Promise<FreeBonusItem[]> {
  const authed = await ensureAuthenticated();
  if (!authed) {
    console.error('listFreeBonuses: usuário não autenticado');
    return [];
  }

  const baseUrl = import.meta.env.VITE_FREE_BONUS_URL?.trim() || '/api/free_bonus';
  const url = `${baseUrl}?user_code=${encodeURIComponent(userCode)}`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
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

const PRIZE_WHEEL_GRANT_URL =
  import.meta.env.VITE_PRIZE_WHEEL_GRANT_URL?.trim() || '/api/prize_wheel/grant';

export async function grantPrizeWheelBonus(params: {
  userCode: string;
  gameCode: string;
  rounds: number;
  cupomUsoId: string;
}): Promise<GrantFreeBonusResult> {
  const authed = await ensureAuthenticated();
  if (!authed) {
    return { ok: false, msg: 'Faça login para ativar as rodadas grátis.' };
  }

  const response = await fetch(PRIZE_WHEEL_GRANT_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_code: params.userCode,
      game_code: params.gameCode,
      rounds: params.rounds,
      cupom_uso_id: params.cupomUsoId,
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

export async function activateCupomFreeBonus(params: {
  userCode: string;
  gameCode: string;
  rounds: number;
  cupomUsoId: string;
}): Promise<GrantFreeBonusResult> {
  return grantPrizeWheelBonus(params);
}

export function getFreeBonusStatusLabel(status: string, lang: AppLanguage = 'pt'): string {
  const labels = getAppCopy(lang).freeBonus;
  const normalized = status.toLowerCase();
  if (normalized === 'pending') return labels.available;
  if (normalized === 'completed' || normalized === 'used') return labels.finished;
  if (normalized === 'active') return labels.inUse;
  return status;
}

export function getFreeBonusStatusClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'pending') return 'bg-emerald-500/20 text-emerald-300';
  if (normalized === 'active') return 'bg-brand/20 text-brand-light';
  if (normalized === 'completed' || normalized === 'used') return 'bg-slate-500/20 text-slate-400';
  return 'bg-amber-500/20 text-amber-300';
}
