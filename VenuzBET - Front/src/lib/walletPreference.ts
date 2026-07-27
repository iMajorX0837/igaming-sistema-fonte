import { supabase } from './supabase';

export type WalletView = 'real' | 'bonus';

export const BALANCE_TOGGLE_COOLDOWN_MS = 20_000;
export const BALANCE_VIEW_STORAGE_PREFIX = 'venuz_header_balance_view';
export const BALANCE_COOLDOWN_STORAGE_PREFIX = 'venuz_header_balance_cooldown';

export function getStoredBalanceView(userId: string): WalletView {
  try {
    const raw = localStorage.getItem(`${BALANCE_VIEW_STORAGE_PREFIX}:${userId}`);
    return raw === 'bonus' ? 'bonus' : 'real';
  } catch {
    return 'real';
  }
}

export function storeBalanceView(userId: string, view: WalletView) {
  try {
    localStorage.setItem(`${BALANCE_VIEW_STORAGE_PREFIX}:${userId}`, view);
  } catch {
    // ignore
  }
}

export function getStoredCooldownUntil(userId: string): number | null {
  try {
    const raw = localStorage.getItem(`${BALANCE_COOLDOWN_STORAGE_PREFIX}:${userId}`);
    if (!raw) return null;
    const until = Number(raw);
    if (!Number.isFinite(until) || until <= Date.now()) {
      localStorage.removeItem(`${BALANCE_COOLDOWN_STORAGE_PREFIX}:${userId}`);
      return null;
    }
    return until;
  } catch {
    return null;
  }
}

export function storeCooldownUntil(userId: string, until: number | null) {
  try {
    const key = `${BALANCE_COOLDOWN_STORAGE_PREFIX}:${userId}`;
    if (until === null || until <= Date.now()) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, String(until));
  } catch {
    // ignore
  }
}

export async function definirCarteiraAtiva(carteira: WalletView): Promise<boolean> {
  const { data, error } = await supabase.rpc('definir_carteira_ativa', {
    p_carteira: carteira,
  });

  if (error) {
    console.error('definir_carteira_ativa:', error);
    return false;
  }

  const result = data as { ok?: boolean };
  return Boolean(result?.ok);
}

export async function obterCarteiraAtiva(): Promise<WalletView | null> {
  const { data, error } = await supabase.rpc('obter_carteira_ativa');

  if (error) {
    console.error('obter_carteira_ativa:', error);
    return null;
  }

  const result = data as { ok?: boolean; carteira_ativa?: WalletView };
  if (!result?.ok) return null;
  return result.carteira_ativa === 'bonus' ? 'bonus' : 'real';
}

export async function syncWalletPreference(userId: string): Promise<WalletView> {
  const local = getStoredBalanceView(userId);
  const remote = await obterCarteiraAtiva();

  if (remote) {
    storeBalanceView(userId, remote);
    return remote;
  }

  await definirCarteiraAtiva(local);
  return local;
}
