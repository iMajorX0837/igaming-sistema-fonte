import { PLAYFIVERS_API_V2 } from '../config/playfivers';
import { resolveProviderImageUrl } from '../lib/providerLogos';
import { playFiversRequestQueue } from './playfiversRequestQueue';
import {
  ensurePlatformGameSettingsLoaded,
  isPlatformGameEnabled,
  isPlatformProviderEnabled,
} from '../lib/platformGames';

const jsonHeaders = { 'Content-Type': 'application/json' };

const PROVIDERS_STORAGE_KEY = 'venuz-playfivers-providers-v2';
const GAMES_STORAGE_KEY = 'venuz-playfivers-games-v1';

/** Provedores mudam pouco — TTL maior. */
const PROVIDERS_TTL_MS = 2 * 60 * 60 * 1000;
/** Jogos — TTL menor; ainda evita rajada de F5. */
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
  rounds_free?: boolean;
  original?: boolean;
}

export interface ApiGamesResponse {
  status: number;
  data: ApiGame[];
  msg: string;
}

interface StorageEntry<T> {
  savedAt: number;
  payload: T;
}

type GamesStorageMap = Record<string, StorageEntry<ApiGamesResponse>>;

/** Carteira dos provedores clone (PGSOFT, PRAGMATIC, etc.) em /api/v2/providers */
export const PLAYFIVERS_SLOTS_WALLET = 'Carteira PlayFiver (Slots)';

export function isPlayFiverSlotsProvider(prov: ApiProvider): boolean {
  return prov.status === 1 && prov.wallet.name === PLAYFIVERS_SLOTS_WALLET;
}

function normalizeProviderName(name: string): string {
  const trimmed = name.trim();
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

async function fetchProvidersFromNetwork(): Promise<ApiProvidersResponse> {
  return playFiversRequestQueue.add(async () => {
    const res = await fetch(`${PLAYFIVERS_API_V2}/providers`, { headers: jsonHeaders });

    if (res.status === 429) {
      const stale = readProvidersFromStorage(true);
      if (stale) {
        providersCache = stale;
        return stale;
      }
      throw new Error('providers 429');
    }

    if (!res.ok) throw new Error(`providers ${res.status}`);

    const data = normalizeProvidersResponse((await res.json()) as ApiProvidersResponse);
    providersCache = data;
    writeProvidersToStorage(data);
    return data;
  });
}

function revalidateProvidersInBackground(): void {
  if (providersRevalidateInflight) return;
  providersRevalidateInflight = fetchProvidersFromNetwork()
    .then(() => undefined)
    .catch((err) => {
      console.warn('PlayFivers: falha ao revalidar provedores em background', err);
    })
    .finally(() => {
      providersRevalidateInflight = null;
    });
}

async function applyPlatformProviderFilter(data: ApiProvidersResponse): Promise<ApiProvidersResponse> {
  if (!data.data?.length) return data;
  const settings = await ensurePlatformGameSettingsLoaded();
  return {
    ...data,
    data: data.data.filter((provider) => isPlatformProviderEnabled(provider.id, settings)),
  };
}

async function applyPlatformGameFilter(
  providerId: number,
  data: ApiGamesResponse
): Promise<ApiGamesResponse> {
  if (!data.data?.length) return data;
  const settings = await ensurePlatformGameSettingsLoaded();
  return {
    ...data,
    data: data.data.filter((game) => isPlatformGameEnabled(providerId, game.game_code, settings)),
  };
}

/** Cache em memória + localStorage + fila; stale-while-revalidate quando TTL expira. */
export function fetchProvidersCached(): Promise<ApiProvidersResponse> {
  if (providersCache) return applyPlatformProviderFilter(providersCache);
  if (providersInflight) return providersInflight;

  const freshStorage = readProvidersFromStorage(false);
  if (freshStorage) {
    providersCache = freshStorage;
    return applyPlatformProviderFilter(freshStorage);
  }

  const staleStorage = readProvidersFromStorage(true);
  if (staleStorage) {
    providersCache = staleStorage;
    revalidateProvidersInBackground();
    return applyPlatformProviderFilter(staleStorage);
  }

  providersInflight = fetchProvidersFromNetwork()
    .then(applyPlatformProviderFilter)
    .finally(() => {
      providersInflight = null;
    });

  return providersInflight;
}

const gamesCache = new Map<number, ApiGamesResponse>();
const gamesInflight = new Map<number, Promise<ApiGamesResponse>>();
const gamesRevalidateInflight = new Set<number>();

async function fetchGamesFromNetwork(providerId: number): Promise<ApiGamesResponse> {
  return playFiversRequestQueue.add(async () => {
    const res = await fetch(`${PLAYFIVERS_API_V2}/games?provider=${providerId}`, {
      headers: jsonHeaders,
    });

    if (res.status === 429) {
      const stale = readGamesFromStorage(providerId, true);
      if (stale) {
        gamesCache.set(providerId, stale);
        return stale;
      }
      throw new Error(`games 429 provider=${providerId}`);
    }

    if (!res.ok) throw new Error(`games ${res.status}`);

    const data = normalizeGamesResponse((await res.json()) as ApiGamesResponse);
    gamesCache.set(providerId, data);
    writeGamesToStorage(providerId, data);
    return data;
  });
}

function revalidateGamesInBackground(providerId: number): void {
  if (gamesRevalidateInflight.has(providerId)) return;
  gamesRevalidateInflight.add(providerId);

  void fetchGamesFromNetwork(providerId)
    .catch((err) => {
      console.warn(`PlayFivers: falha ao revalidar jogos do provider ${providerId}`, err);
    })
    .finally(() => {
      gamesRevalidateInflight.delete(providerId);
    });
}

/** Cache por provider id — memória, localStorage, fila e revalidação em background. */
export function fetchGamesForProviderCached(providerId: number): Promise<ApiGamesResponse> {
  const memoryHit = gamesCache.get(providerId);
  if (memoryHit) return applyPlatformGameFilter(providerId, memoryHit);

  const inflight = gamesInflight.get(providerId);
  if (inflight) return inflight;

  const freshStorage = readGamesFromStorage(providerId, false);
  if (freshStorage) {
    gamesCache.set(providerId, freshStorage);
    return applyPlatformGameFilter(providerId, freshStorage);
  }

  const staleStorage = readGamesFromStorage(providerId, true);
  if (staleStorage) {
    gamesCache.set(providerId, staleStorage);
    revalidateGamesInBackground(providerId);
    return applyPlatformGameFilter(providerId, staleStorage);
  }

  const request = fetchGamesFromNetwork(providerId)
    .then((data) => applyPlatformGameFilter(providerId, data))
    .finally(() => {
      gamesInflight.delete(providerId);
    });
  gamesInflight.set(providerId, request);
  return request;
}
