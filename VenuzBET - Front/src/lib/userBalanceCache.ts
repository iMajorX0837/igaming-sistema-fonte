import { supabase } from './supabase';

export interface UserBalance {
  saldo: number;
  saldo_bonus: number;
}

let cachedUserId: string | null = null;
let cachedBalance: UserBalance | null = null;
let inflight: Promise<UserBalance | null> | null = null;

export function invalidateUserBalanceCache(userId?: string) {
  if (!userId || cachedUserId === userId) {
    cachedUserId = null;
    cachedBalance = null;
  }
}

export async function fetchUserBalanceCached(userId: string): Promise<UserBalance | null> {
  if (cachedUserId === userId && cachedBalance) {
    return cachedBalance;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('saldo, saldo_bonus')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar saldo:', error);
        return null;
      }

      if (!data) return null;

      const balance: UserBalance = {
        saldo: Number(data.saldo) || 0,
        saldo_bonus: Number(data.saldo_bonus) || 0,
      };

      cachedUserId = userId;
      cachedBalance = balance;
      return balance;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
