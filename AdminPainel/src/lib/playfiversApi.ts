import {
  fetchWithRateLimitRetry,
  playFiversRequestQueue,
} from './playfiversRequestQueue';



function getPlayFiversApiBase(): string {

  const fromEnv = import.meta.env.VITE_PLAYFIVERS_API_BASE?.trim();

  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (import.meta.env.DEV) return '/api/v2';

  throw new Error('Defina VITE_PLAYFIVERS_API_BASE no .env (ex.: /api/v2).');

}



export const PLAYFIVERS_API_V2 = getPlayFiversApiBase();

export const PLAYFIVERS_SLOTS_WALLET = 'Carteira PlayFiver (Slots)';



const jsonHeaders = { Accept: 'application/json' };



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



export function isPlayFiverSlotsProvider(prov: ApiProvider): boolean {

  return prov.status === 1 && prov.wallet.name === PLAYFIVERS_SLOTS_WALLET;

}



export function createSlug(text: string): string {

  return text

    .toLowerCase()

    .normalize('NFD')

    .replace(/[\u0300-\u036f]/g, '')

    .replace(/[^a-z0-9]+/g, '-')

    .replace(/^-+|-+$/g, '');

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

    Evoplay: 'evoplay',

    BGaming: 'bgaming',

    Ezugi: 'ezugi',

    'C Games': 'cgames',
    Propria: 'propria',
    Própria: 'propria',
  };



  const trimmed = providerName.trim();

  if (providerMap[trimmed]) return providerMap[trimmed];



  const lower = trimmed.toLowerCase();

  if (lower.includes('pragmatic') && lower.includes('live')) return 'pragmaticlive';

  if (lower.includes('pragmatic')) return 'pragmatic';

  if (lower.includes('pg soft') || lower.includes('pgsoft')) return 'pgsoft';



  return createSlug(trimmed);

}



let providersInflight: Promise<ApiProvidersResponse> | null = null;

const gamesInflight = new Map<number, Promise<ApiGamesResponse>>();



async function fetchProvidersFromNetwork(): Promise<ApiProvidersResponse> {

  const res = await fetchWithRateLimitRetry(`${PLAYFIVERS_API_V2}/providers`, {

    headers: jsonHeaders,

  });



  if (res.status === 429) {

    throw new Error('Limite de requisições atingido ao buscar provedores. Tente novamente em instantes.');

  }



  if (!res.ok) {

    throw new Error(`Erro ao buscar provedores (${res.status})`);

  }



  return res.json() as Promise<ApiProvidersResponse>;

}



async function fetchGamesFromNetwork(providerId: number): Promise<ApiGamesResponse> {

  const res = await fetchWithRateLimitRetry(

    `${PLAYFIVERS_API_V2}/games?provider=${providerId}`,

    { headers: jsonHeaders }

  );



  if (res.status === 429) {

    throw new Error(

      `Limite de requisições atingido ao buscar jogos do provedor ${providerId}. Tente novamente em instantes.`

    );

  }



  if (!res.ok) {

    throw new Error(`Erro ao buscar jogos do provedor ${providerId} (${res.status})`);

  }



  return res.json() as Promise<ApiGamesResponse>;

}



export async function fetchProviders(): Promise<ApiProvidersResponse> {

  if (providersInflight) return providersInflight;



  providersInflight = playFiversRequestQueue

    .add(fetchProvidersFromNetwork)

    .finally(() => {

      providersInflight = null;

    });



  return providersInflight;

}



export async function fetchGamesForProvider(providerId: number): Promise<ApiGamesResponse> {

  const inflight = gamesInflight.get(providerId);

  if (inflight) return inflight;



  const request = playFiversRequestQueue

    .add(() => fetchGamesFromNetwork(providerId))

    .finally(() => {

      gamesInflight.delete(providerId);

    });



  gamesInflight.set(providerId, request);

  return request;

}



export function getPlayFiversQueueStats() {

  return {

    pending: playFiversRequestQueue.pendingCount,

    active: playFiversRequestQueue.activeCount,

  };

}

