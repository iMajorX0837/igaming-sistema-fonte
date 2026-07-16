import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authRequestQueue } from './authRequestQueue';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  cargo?: string | null;
}

const CARGO_CACHE_KEY = (userId: string) => `user_cargo_${userId}`;
const CARGO_CACHE_TTL_MS = 60 * 60 * 1000;
const RPC_TIMEOUT_MS = 5000;
const QUERY_TIMEOUT_MS = 5000;

interface CargoCacheEntry {
  cargo: string;
  timestamp: number;
}

const withTimeout = <T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout após ${ms / 1000} segundos`)), ms)
    ),
  ]);

export const getCargoFromCache = (userId: string, allowStale = false): string | undefined => {
  try {
    const raw = localStorage.getItem(CARGO_CACHE_KEY(userId));
    if (!raw) return undefined;

    const { cargo, timestamp } = JSON.parse(raw) as CargoCacheEntry;
    if (!cargo) return undefined;

    if (allowStale || Date.now() - timestamp < CARGO_CACHE_TTL_MS) {
      return cargo;
    }
  } catch (error) {
    console.error('[userCargo] Erro ao ler cache:', error);
  }

  return undefined;
};

export const setCargoInCache = (userId: string, cargo: string | undefined) => {
  try {
    if (cargo) {
      localStorage.setItem(
        CARGO_CACHE_KEY(userId),
        JSON.stringify({ cargo, timestamp: Date.now() } satisfies CargoCacheEntry)
      );
    } else {
      localStorage.removeItem(CARGO_CACHE_KEY(userId));
    }
  } catch (error) {
    console.error('[userCargo] Erro ao salvar cache:', error);
  }
};

const buildUser = (supabaseUser: SupabaseUser, cargo?: string | null): AdminUser => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  name: supabaseUser.email?.split('@')[0] || '',
  cargo: cargo ?? undefined,
});

const fetchCargoFromNetwork = async (userId: string): Promise<string | undefined> => {
  let cargo: string | undefined;

  try {
    const { data: rpcCargo, error: rpcError } = await withTimeout(
      supabase.rpc('get_user_cargo'),
      RPC_TIMEOUT_MS,
      'RPC get_user_cargo'
    );

    if (!rpcError && rpcCargo != null) {
      cargo = rpcCargo;
      setCargoInCache(userId, cargo);
      return cargo;
    }

    if (rpcError) {
      console.warn('[userCargo] RPC falhou, tentando query direta:', rpcError.message);
    }
  } catch (rpcError) {
    console.warn('[userCargo] RPC timeout ou erro:', rpcError);
  }

  try {
    const { data: usuario, error: queryError } = await withTimeout(
      supabase.from('usuarios').select('cargo').eq('id', userId).maybeSingle(),
      QUERY_TIMEOUT_MS,
      'Query usuarios.cargo'
    );

    if (!queryError && usuario) {
      cargo = usuario.cargo || undefined;
      if (cargo) setCargoInCache(userId, cargo);
      return cargo;
    }

    if (queryError) {
      console.warn('[userCargo] Query direta falhou:', queryError.message);
    }
  } catch (queryError) {
    console.warn('[userCargo] Query timeout ou erro:', queryError);
  }

  return getCargoFromCache(userId, true);
};

export const fetchUserCargo = (userId: string): Promise<string | undefined> =>
  authRequestQueue.enqueue(`cargo:${userId}`, () => fetchCargoFromNetwork(userId));

export const mapSupabaseUserToUser = async (
  supabaseUser: SupabaseUser,
  options: { preferCache?: boolean } = {}
): Promise<AdminUser> => {
  const { preferCache = true } = options;

  if (preferCache) {
    const cachedCargo = getCargoFromCache(supabaseUser.id) ?? getCargoFromCache(supabaseUser.id, true);
    if (cachedCargo) {
      return buildUser(supabaseUser, cachedCargo);
    }
  }

  const cargo = await fetchUserCargo(supabaseUser.id);
  return buildUser(supabaseUser, cargo);
};

export const refreshUserCargoInBackground = (
  supabaseUser: SupabaseUser,
  onUpdate: (user: AdminUser) => void
): void => {
  if (authRequestQueue.hasPending(`cargo:${supabaseUser.id}`)) {
    return;
  }

  void fetchUserCargo(supabaseUser.id).then((cargo) => {
    onUpdate(buildUser(supabaseUser, cargo));
  });
};
