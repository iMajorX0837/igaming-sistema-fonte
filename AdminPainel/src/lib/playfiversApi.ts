import {
  fetchWithRateLimitRetry,
  playFiversRequestQueue,
} from './playfiversRequestQueue';
import { resolveProviderImageUrl } from './providerLogos';
import { isPlayFiverSpribeProvider, PLAYFIVERS_SPRIBE_WALLET } from './officialSpribe';

function getPlayFiversApiBase(): string {
  const fromEnv = import.meta.env.VITE_PLAYFIVERS_API_BASE?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (import.meta.env.DEV) return '/api/v2';
  throw new Error('Defina VITE_PLAYFIVERS_API_BASE no .env (ex.: /api/v2).');
}

export const PLAYFIVERS_API_V2 = getPlayFiversApiBase();

export const PLAYFIVERS_SLOTS_WALLET = 'Carteira PlayFiver (Slots)';
export const PLAYFIVERS_LIVE_WALLET = 'Carteira Oficial (Live)';

export { PLAYFIVERS_SPRIBE_WALLET };

const jsonHeaders = { Accept: 'application/json' };

const PROVIDERS_STORAGE_KEY = 'venuz-admin-playfivers-providers-v1';
const GAMES_STORAGE_KEY = 'venuz-admin-playfivers-games-v1';
const PROVIDERS_TTL_MS = 2 * 60 * 60 * 1000;
const GAMES_TTL_MS = 60 * 60 * 1000;

export interface ApiProvider {
  id: number;
  name: string;
  image_url: string;
  wallet: { name: string };
  status: number;
}

export interface ApiProvidersResponse {
  status: number;
  data: ApiProvider[];
  msg: string;
}

export interface ApiGame {
  name: string;
  image_url: string;
  status: boolean;
  game_code: string;
  provider: { name: string };
}

export interface ApiGamesResponse {
  status: number;
  data: ApiGame[];
  msg: string;
}

export interface PlayFiversFetchOptions {
  /** Ignora cache em memória/localStorage e busca na API. */
  force?: boolean;
}

interface StorageEntry<T> {
  savedAt: number;
  payload: T;
}

type GamesStorageMap = Record<string, StorageEntry<ApiGamesResponse>>;

export function isPlayFiverSlotsProvider(prov: ApiProvider): boolean {
  return prov.status === 1 && prov.wallet.name === PLAYFIVERS_SLOTS_WALLET;
}

export function isPlayFiverLiveProvider(prov: ApiProvider): boolean {
  return prov.status === 1 && prov.wallet.name === PLAYFIVERS_LIVE_WALLET;
}

export function isPlayFiverEnabledProvider(prov: ApiProvider): boolean {
  return isPlayFiverSlotsProvider(prov) || isPlayFiverLiveProvider(prov) || isPlayFiverSpribeProvider(prov);
}

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeProviderName(providerName: string): string {
  const trimmed = providerName.trim();
  if (trimmed === 'Propria' || trimmed === 'Própria') return 'Spribe';
  return trimmed;
}

function normalizeProvidersResponse(data: ApiProvidersResponse): ApiProvidersResponse {
  if (!data.data?.length) return data;
  return {
    ...data,
    data: data.data.map((provider) => {
      const name = normalizeProviderName(provider.name);
      return {
        ...provider,
        name,
        image_url: resolveProviderImageUrl(name, provider.image_url),
      };
    }),
  };
}

function normalizeGamesResponse(data: ApiGamesResponse): ApiGamesResponse {
  if (!data.data?.length) return data;
  return {
    ...data,
    data: data.data.map((game) => ({
      ...game,
      provider: {
        ...game.provider,
        name: normalizeProviderName(game.provider.name),
      },
    })),
  };
}

export function getProviderSlug(providerName: string): string {
  const providerMap: Record<string, string> = {
    'PG Soft': 'pgsoft',
    Pgsoft: 'pgsoft',
    'Pragmatic Play': 'pragmatic',
    Pragmatic: 'pragmatic',
    'Pragmatic Live': 'pragmaticlive',
    NetEnt: 'netent',
    'Evolution Gaming': 'evolution',
    'Red Tiger': 'redtiger',
    Playson: 'playson',
    Habanero: 'habanero',
    Spribe: 'spribe',
    Propria: 'spribe',
    Própria: 'spribe',
    'OFICIAL - SPRIBE': 'oficial-spribe',
    Evoplay: 'evoplay',
    BGaming: 'bgaming',
    Ezugi: 'ezugi',
    'C Games': 'cgames',
  };

  const normalizedName = normalizeProviderName(providerName);
  const trimmed = normalizedName.trim();
  if (providerMap[trimmed]) return providerMap[trimmed];
  if (providerMap[providerName.trim()]) return providerMap[providerName.trim()];

  const lower = trimmed.toLowerCase();
  if (lower.includes('pragmatic') && lower.includes('live')) return 'pragmaticlive';
  if (lower.includes('pragmatic')) return 'pragmatic';
  if (lower.includes('pg soft') || lower.includes('pgsoft')) return 'pgsoft';
  if (lower.includes('propria') || lower.includes('própria')) return 'spribe';

  return createSlug(trimmed);
}

function isFresh(savedAt: number, ttlMs: number): boolean {
  return Date.now() - savedAt < ttlMs;
}

function readProvidersFromStorage(allowStale = false): ApiProvidersResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROVIDERS_STORAGE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as StorageEntry<ApiProvidersResponse>;
    if (!entry?.payload?.data) return null;
    if (!allowStale && !isFresh(entry.savedAt, PROVIDERS_TTL_MS)) return null;
    return entry.payload;
  } catch {
    return null;
  }
}

function writeProvidersToStorage(payload: ApiProvidersResponse): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: StorageEntry<ApiProvidersResponse> = { savedAt: Date.now(), payload };
    localStorage.setItem(PROVIDERS_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // quota / private mode
  }
}

function readGamesMapFromStorage(): GamesStorageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(GAMES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as GamesStorageMap;
  } catch {
    return {};
  }
}

function readGamesFromStorage(providerId: number, allowStale = false): ApiGamesResponse | null {
  const entry = readGamesMapFromStorage()[String(providerId)];
  if (!entry?.payload?.data) return null;
  if (!allowStale && !isFresh(entry.savedAt, GAMES_TTL_MS)) return null;
  return entry.payload;
}

function writeGamesToStorage(providerId: number, payload: ApiGamesResponse): void {
  if (typeof window === 'undefined') return;
  try {
    const map = readGamesMapFromStorage();
    map[String(providerId)] = { savedAt: Date.now(), payload };
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

let providersCache: ApiProvidersResponse | null = null;
let providersInflight: Promise<ApiProvidersResponse> | null = null;
let providersRevalidateInflight: Promise<void> | null = null;

const gamesCache = new Map<number, ApiGamesResponse>();
const gamesInflight = new Map<number, Promise<ApiGamesResponse>>();
const gamesRevalidateInflight = new Set<number>();

export function clearPlayFiversCatalogCache(): void {
  providersCache = null;
  providersInflight = null;
  providersRevalidateInflight = null;
  gamesCache.clear();
  gamesInflight.clear();
  gamesRevalidateInflight.clear();

  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROVIDERS_STORAGE_KEY);
    localStorage.removeItem(GAMES_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function fetchProvidersFromNetwork(): Promise<ApiProvidersResponse> {
  const res = await fetchWithRateLimitRetry(`${PLAYFIVERS_API_V2}/providers`, {
    headers: jsonHeaders,
  });

  if (res.status === 429) {
    const stale = readProvidersFromStorage(true);
    if (stale) {
      providersCache = stale;
      return stale;
    }
    throw new Error('Limite de requisições atingido ao buscar provedores. Tente novamente em instantes.');
  }

  if (!res.ok) {
    throw new Error(`Erro ao buscar provedores (${res.status})`);
  }

  const data = normalizeProvidersResponse((await res.json()) as ApiProvidersResponse);
  providersCache = data;
  writeProvidersToStorage(data);
  return data;
}

async function fetchGamesFromNetwork(providerId: number): Promise<ApiGamesResponse> {
  const res = await fetchWithRateLimitRetry(`${PLAYFIVERS_API_V2}/games?provider=${providerId}`, {
    headers: jsonHeaders,
  });

  if (res.status === 429) {
    const stale = readGamesFromStorage(providerId, true);
    if (stale) {
      gamesCache.set(providerId, stale);
      return stale;
    }
    throw new Error(
      `Limite de requisições atingido ao buscar jogos do provedor ${providerId}. Tente novamente em instantes.`
    );
  }

  if (!res.ok) {
    throw new Error(`Erro ao buscar jogos do provedor ${providerId} (${res.status})`);
  }

  const data = normalizeGamesResponse((await res.json()) as ApiGamesResponse);
  gamesCache.set(providerId, data);
  writeGamesToStorage(providerId, data);
  return data;
}

function revalidateProvidersInBackground(): void {
  if (providersRevalidateInflight) return;

  providersRevalidateInflight = playFiversRequestQueue
    .add(fetchProvidersFromNetwork)
    .then(() => undefined)
    .catch((err) => {
      console.warn('PlayFivers admin: falha ao revalidar provedores em background', err);
    })
    .finally(() => {
      providersRevalidateInflight = null;
    });
}

function revalidateGamesInBackground(providerId: number): void {
  if (gamesRevalidateInflight.has(providerId)) return;
  gamesRevalidateInflight.add(providerId);

  void playFiversRequestQueue
    .add(() => fetchGamesFromNetwork(providerId))
    .catch((err) => {
      console.warn(`PlayFivers admin: falha ao revalidar jogos do provider ${providerId}`, err);
    })
    .finally(() => {
      gamesRevalidateInflight.delete(providerId);
    });
}

function fetchProvidersFromNetworkQueued(): Promise<ApiProvidersResponse> {
  if (providersInflight) return providersInflight;

  providersInflight = playFiversRequestQueue.add(fetchProvidersFromNetwork).finally(() => {
    providersInflight = null;
  });

  return providersInflight;
}

function fetchGamesFromNetworkQueued(providerId: number): Promise<ApiGamesResponse> {
  const inflight = gamesInflight.get(providerId);
  if (inflight) return inflight;

  const request = playFiversRequestQueue.add(() => fetchGamesFromNetwork(providerId)).finally(() => {
    gamesInflight.delete(providerId);
  });

  gamesInflight.set(providerId, request);
  return request;
}

/** Cache em memória + localStorage + fila; stale-while-revalidate quando TTL expira. */
export async function fetchProviders(options?: PlayFiversFetchOptions): Promise<ApiProvidersResponse> {
  if (options?.force) {
    providersCache = null;
    return fetchProvidersFromNetworkQueued();
  }

  if (providersCache) return providersCache;
  if (providersInflight) return providersInflight;

  const freshStorage = readProvidersFromStorage(false);
  if (freshStorage) {
    providersCache = freshStorage;
    return freshStorage;
  }

  const staleStorage = readProvidersFromStorage(true);
  if (staleStorage) {
    providersCache = staleStorage;
    revalidateProvidersInBackground();
    return staleStorage;
  }

  return fetchProvidersFromNetworkQueued();
}

/** Cache por provider id — memória, localStorage, fila e revalidação em background. */
export async function fetchGamesForProvider(
  providerId: number,
  options?: PlayFiversFetchOptions
): Promise<ApiGamesResponse> {
  if (options?.force) {
    gamesCache.delete(providerId);
    return fetchGamesFromNetworkQueued(providerId);
  }

  const memoryHit = gamesCache.get(providerId);
  if (memoryHit) return memoryHit;

  const inflight = gamesInflight.get(providerId);
  if (inflight) return inflight;

  const freshStorage = readGamesFromStorage(providerId, false);
  if (freshStorage) {
    gamesCache.set(providerId, freshStorage);
    return freshStorage;
  }

  const staleStorage = readGamesFromStorage(providerId, true);
  if (staleStorage) {
    gamesCache.set(providerId, staleStorage);
    revalidateGamesInBackground(providerId);
    return staleStorage;
  }

  return fetchGamesFromNetworkQueued(providerId);
}

export function getPlayFiversQueueStats() {
  return {
    pending: playFiversRequestQueue.pendingCount,
    active: playFiversRequestQueue.activeCount,
  };
}
