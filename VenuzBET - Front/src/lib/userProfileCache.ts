import { supabase } from './supabase';

export interface UserProfileData {
  nome: string | null;
  usuario_nome: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
}

export interface BetHistoryItem {
  tipo: string;
  jogo: string;
  valor: number;
  retorno: number;
  status: string;
  bonus: string;
  data: string;
}

export const EMPTY_USER_PROFILE: UserProfileData = {
  nome: null,
  usuario_nome: null,
  cpf: null,
  telefone: null,
  email: null,
};

const USER_PROFILE_TTL_MS = 5 * 60 * 1000;
const BET_HISTORY_TTL_MS = 60 * 1000;

interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

function isFresh(savedAt: number, ttlMs: number): boolean {
  return Date.now() - savedAt < ttlMs;
}

const userProfileCache = new Map<string, CacheEntry<UserProfileData>>();
const userProfileInflight = new Map<string, Promise<UserProfileData>>();
const userProfileRevalidate = new Set<string>();

const betHistoryCache = new Map<string, CacheEntry<BetHistoryItem[]>>();
const betHistoryInflight = new Map<string, Promise<BetHistoryItem[]>>();
const betHistoryRevalidate = new Set<string>();

export function getCachedUserProfile(userId: string): UserProfileData | null {
  return userProfileCache.get(userId)?.data ?? null;
}

export function setCachedUserProfile(userId: string, data: UserProfileData): void {
  userProfileCache.set(userId, { savedAt: Date.now(), data });
}

export function getCachedBetHistory(userId: string, period: string): BetHistoryItem[] | null {
  return betHistoryCache.get(`${userId}:${period}`)?.data ?? null;
}

export function setCachedBetHistory(
  userId: string,
  period: string,
  data: BetHistoryItem[]
): void {
  betHistoryCache.set(`${userId}:${period}`, { savedAt: Date.now(), data });
}

export function clearUserProfileCaches(userId?: string): void {
  if (!userId) {
    userProfileCache.clear();
    userProfileInflight.clear();
    userProfileRevalidate.clear();
    betHistoryCache.clear();
    betHistoryInflight.clear();
    betHistoryRevalidate.clear();
    return;
  }

  userProfileCache.delete(userId);
  userProfileInflight.delete(userId);
  userProfileRevalidate.delete(userId);

  for (const key of betHistoryCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      betHistoryCache.delete(key);
      betHistoryInflight.delete(key);
      betHistoryRevalidate.delete(key);
    }
  }
}

async function fetchUserProfileFromNetwork(userId: string): Promise<UserProfileData> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('nome, usuario_nome, cpf, telefone, email')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    throw error;
  }

  const profile: UserProfileData = {
    nome: data?.nome ?? null,
    usuario_nome: data?.usuario_nome ?? null,
    cpf: data?.cpf ?? null,
    telefone: data?.telefone ?? null,
    email: data?.email ?? null,
  };

  setCachedUserProfile(userId, profile);
  return profile;
}

function revalidateUserProfileInBackground(userId: string): void {
  if (userProfileRevalidate.has(userId)) return;
  userProfileRevalidate.add(userId);

  void fetchUserProfileFromNetwork(userId)
    .catch((err) => {
      console.warn('Falha ao revalidar perfil em background', err);
    })
    .finally(() => {
      userProfileRevalidate.delete(userId);
    });
}

export function fetchUserProfileCached(userId: string): Promise<UserProfileData> {
  const cached = userProfileCache.get(userId);
  if (cached) {
    if (!isFresh(cached.savedAt, USER_PROFILE_TTL_MS)) {
      revalidateUserProfileInBackground(userId);
    }
    return Promise.resolve(cached.data);
  }

  const inflight = userProfileInflight.get(userId);
  if (inflight) return inflight;

  const request = fetchUserProfileFromNetwork(userId).finally(() => {
    userProfileInflight.delete(userId);
  });
  userProfileInflight.set(userId, request);
  return request;
}

function getStartDate(period: string): string | null {
  const now = new Date();
  const start = new Date();

  switch (period) {
    case 'hoje':
      start.setHours(0, 0, 0, 0);
      break;
    case 'ontem':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      break;
    case '7dias':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case '30dias':
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'total':
      return null;
    default:
      start.setHours(0, 0, 0, 0);
  }

  return start.toISOString();
}

function mapBetHistoryRows(data: Record<string, unknown>[]): BetHistoryItem[] {
  return data.map((item) => ({
    tipo: item.tipo === 'Ganhou' ? 'win' : 'lose',
    jogo: String(item.jogo || 'Jogo Desconhecido'),
    valor: parseFloat(String(item.valor)) || 0,
    retorno: parseFloat(String(item.retorno)) || 0,
    status: String(item.status || 'Finalizado'),
    bonus: String(item.com_bonus || 'Não'),
    data: new Date(String(item.data)).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));
}

async function fetchBetHistoryFromNetwork(
  userId: string,
  period: string
): Promise<BetHistoryItem[]> {
  const startDate = getStartDate(period);

  let query = supabase
    .from('transacoes_jogos')
    .select('*')
    .eq('usuario_id', userId)
    .order('data', { ascending: false });

  if (startDate) {
    query = query.gte('data', startDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar histórico de apostas:', error);
    throw error;
  }

  const history = mapBetHistoryRows((data as Record<string, unknown>[]) || []);
  setCachedBetHistory(userId, period, history);
  return history;
}

function revalidateBetHistoryInBackground(userId: string, period: string): void {
  const cacheKey = `${userId}:${period}`;
  if (betHistoryRevalidate.has(cacheKey)) return;
  betHistoryRevalidate.add(cacheKey);

  void fetchBetHistoryFromNetwork(userId, period)
    .catch((err) => {
      console.warn('Falha ao revalidar histórico em background', err);
    })
    .finally(() => {
      betHistoryRevalidate.delete(cacheKey);
    });
}

export function fetchBetHistoryCached(userId: string, period: string): Promise<BetHistoryItem[]> {
  const cacheKey = `${userId}:${period}`;
  const cached = betHistoryCache.get(cacheKey);

  if (cached) {
    if (!isFresh(cached.savedAt, BET_HISTORY_TTL_MS)) {
      revalidateBetHistoryInBackground(userId, period);
    }
    return Promise.resolve(cached.data);
  }

  const inflight = betHistoryInflight.get(cacheKey);
  if (inflight) return inflight;

  const request = fetchBetHistoryFromNetwork(userId, period).finally(() => {
    betHistoryInflight.delete(cacheKey);
  });
  betHistoryInflight.set(cacheKey, request);
  return request;
}
