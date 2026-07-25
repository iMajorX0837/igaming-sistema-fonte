import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authRequestQueue } from './authRequestQueue';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  cargo?: string | null;
}

const RPC_TIMEOUT_MS = 8000;

const withTimeout = <T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout após ${ms / 1000} segundos`)), ms)
    ),
  ]);

const buildUser = (supabaseUser: SupabaseUser, cargo?: string | null): AdminUser => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  name: supabaseUser.email?.split('@')[0] || '',
  cargo: cargo ?? undefined,
});

/** Cargo sempre via RPC server-side (auth.uid) — sem localStorage (M3). */
const fetchCargoFromNetwork = async (): Promise<string | undefined> => {
  try {
    const { data: rpcCargo, error: rpcError } = await withTimeout(
      supabase.rpc('get_user_cargo'),
      RPC_TIMEOUT_MS,
      'RPC get_user_cargo'
    );

    if (rpcError) {
      console.warn('[userCargo] get_user_cargo falhou:', rpcError.message);
      return undefined;
    }

    if (rpcCargo == null || rpcCargo === '') {
      return undefined;
    }

    return String(rpcCargo);
  } catch (error) {
    console.warn('[userCargo] get_user_cargo erro:', error);
    return undefined;
  }
};

export const fetchUserCargo = (_userId: string): Promise<string | undefined> =>
  authRequestQueue.enqueue('cargo:server', () => fetchCargoFromNetwork());

export const mapSupabaseUserToUser = async (supabaseUser: SupabaseUser): Promise<AdminUser> => {
  const cargo = await fetchUserCargo(supabaseUser.id);
  return buildUser(supabaseUser, cargo);
};
