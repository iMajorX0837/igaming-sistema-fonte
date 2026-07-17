import type { NavigateFunction } from 'react-router-dom';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverSlotsProvider } from '../api/playfiversCache';
import {
  AVIATOR_GAME_IMAGE,
  findProprietaryGameByName,
  PROPRIETARY_PROVIDER,
  PROPRIETARY_PROVIDER_ID,
} from '../lib/proprietaryCatalog';
import {
  ensurePlatformGameSettingsLoaded,
  isPlatformGameEnabled,
  isPlatformProviderEnabled,
} from '../lib/platformGames';

const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getProviderSlug = (providerName: string): string => {
  const providerMap: { [key: string]: string } = {
    'PG Soft': 'pgsoft',
    'Pgsoft': 'pgsoft',
    'Pragmatic Play': 'pragmatic',
    'Pragmatic': 'pragmatic',
    'Pragmatic Live': 'pragmaticlive',
    'NetEnt': 'netent',
    'Evolution Gaming': 'evolution',
    'Red Tiger': 'redtiger',
    'Playson': 'playson',
    'Habanero': 'habanero',
    'Spribe': 'spribe',
    'Evoplay': 'evoplay',
    'BGaming': 'bgaming',
    'Ezugi': 'ezugi',
    'C Games': 'cgames',
  };

  return providerMap[providerName] || createSlug(providerName);
};

const gameMapping: { [key: string]: { provider: string; image: string } } = {
  Mines: { provider: 'Spribe', image: 'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/mines.svg' },
  'Fortune Dragon': { provider: 'Pgsoft', image: 'https://imagensfivers.com/Games/Pgsoft/1695365.webp' },
  'Fortune Tiger': { provider: 'Pgsoft', image: 'https://imagensfivers.com/Games/Pgsoft/126.webp' },
  Aviator: { provider: 'Spribe', image: AVIATOR_GAME_IMAGE },
};

interface ApiGame {
  name: string;
  image_url: string;
  status: boolean;
  game_code: string;
  provider: { name: string };
}

interface ApiResponse {
  status: number;
  data: ApiGame[];
  msg: string;
}

interface ApiProvider {
  id: number;
  name: string;
  wallet: { name: string };
  status: number;
}

interface ApiProvidersResponse {
  status: number;
  data: ApiProvider[];
  msg: string;
}

/** Abre o jogo pela label do menu (Mines, Aviator, etc.), mesma lógica do Sidebar. */
export async function navigateToGameByName(gameName: string, navigate: NavigateFunction): Promise<boolean> {
  const gameInfo = gameMapping[gameName];
  if (!gameInfo) return false;

  try {
    const proprietaryGame = findProprietaryGameByName(gameName);
    if (proprietaryGame) {
      const settings = await ensurePlatformGameSettingsLoaded();
      const providerOk = isPlatformProviderEnabled(PROPRIETARY_PROVIDER_ID, settings);
      const gameOk = isPlatformGameEnabled(
        PROPRIETARY_PROVIDER_ID,
        proprietaryGame.game_code,
        settings
      );

      if (providerOk && gameOk) {
        sessionStorage.setItem('previousPath', window.location.pathname);
        const gameUrl = `/${PROPRIETARY_PROVIDER.slug}/${createSlug(proprietaryGame.nome)}`;
        sessionStorage.setItem(
          'gameData',
          JSON.stringify({
            name: proprietaryGame.nome,
            provider: PROPRIETARY_PROVIDER.name,
            image: proprietaryGame.image_url || gameInfo.image,
            game_code: proprietaryGame.game_code,
            path: gameUrl,
          })
        );
        navigate(gameUrl);
        return true;
      }
    }

    const providersData: ApiProvidersResponse = await fetchProvidersCached();

    if (providersData.status !== 1 || !providersData.data) {
      return false;
    }

    const filteredProviders = providersData.data.filter(isPlayFiverSlotsProvider);

    const gamesPromises = filteredProviders.map(async (prov) => {
      try {
        const apiData: ApiResponse = await fetchGamesForProviderCached(prov.id);
        if (apiData.status === 1 && apiData.data) {
          return apiData.data.filter((game) => game.status === true);
        }
        return [];
      } catch {
        return [];
      }
    });

    const gamesResults = await Promise.all(gamesPromises);
    const allGames = gamesResults.flat();

    const gameNameNormalized = gameName.toLowerCase().trim();
    const providerNormalized = gameInfo.provider.toLowerCase().trim();

    const foundGame = allGames.find((apiGame) => {
      const apiNameNormalized = apiGame.name.toLowerCase().trim();
      const apiProviderNormalized = apiGame.provider.name.toLowerCase().trim();

      return (
        apiNameNormalized === gameNameNormalized &&
        (apiProviderNormalized.includes(providerNormalized) || providerNormalized.includes(apiProviderNormalized))
      );
    });

    if (foundGame) {
      sessionStorage.setItem('previousPath', window.location.pathname);

      const providerSlug = getProviderSlug(foundGame.provider.name);
      const gameSlug = createSlug(foundGame.name);
      const gameUrl = `/${providerSlug}/${gameSlug}`;

      sessionStorage.setItem(
        'gameData',
        JSON.stringify({
          name: foundGame.name,
          provider: foundGame.provider.name,
          image: foundGame.image_url || gameInfo.image,
          game_code: foundGame.game_code,
          path: gameUrl,
        })
      );

      navigate(gameUrl);
      return true;
    }
  } catch (err) {
    console.error('Erro ao buscar jogo:', err);
  }

  return false;
}
