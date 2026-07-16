import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverSlotsProvider } from '../api/playfiversCache';
import { useRecommendedBanners } from '../hooks/useRecommendedBanners';

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

interface ApiGame {
  name: string;
  image_url: string;
  status: boolean;
  game_code: string;
  provider: {
    name: string;
  };
}

interface ApiResponse {
  status: number;
  data: ApiGame[];
  msg: string;
}

interface ApiProvider {
  id: number;
  name: string;
  wallet: {
    name: string;
  };
  status: number;
}

interface ApiProvidersResponse {
  status: number;
  data: ApiProvider[];
  msg: string;
}

export default function RecommendedBanners({ title = 'Recomendados' }: { title?: string }) {
  const navigate = useNavigate();
  const { banners, loading } = useRecommendedBanners();

  const handleBannerClick = useCallback(async (gameName: string, provider: string) => {
    try {
      const providersData: ApiProvidersResponse = await fetchProvidersCached();

      if (providersData.status !== 1 || !providersData.data) {
        console.error('Provedores não encontrados');
        return;
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
      const providerNormalized = provider.toLowerCase().trim();

      const foundGame = allGames.find((apiGame) => {
        const apiNameNormalized = apiGame.name.toLowerCase().trim();
        const apiProviderNormalized = apiGame.provider.name.toLowerCase().trim();

        return (
          apiNameNormalized === gameNameNormalized &&
          (apiProviderNormalized.includes(providerNormalized) ||
            providerNormalized.includes(apiProviderNormalized))
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
            image: foundGame.image_url,
            game_code: foundGame.game_code,
          })
        );

        navigate(gameUrl);
      } else {
        console.error(`Jogo ${gameName} não encontrado na API`);
      }
    } catch (err) {
      console.error('Erro ao buscar jogo:', err);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div>
        <h4 className="text-white font-bold text-xl tracking-tight mb-4 mt-0">{title}</h4>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="aspect-[4/3] rounded-lg sm:rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-white font-bold text-xl tracking-tight mb-4 mt-0">{title}</h4>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {banners.map((banner) => {
          const mobileImage = banner.imagem_mobile_url || banner.imagem_url;

          return (
            <div
              key={banner.id}
              onClick={() => handleBannerClick(banner.game_name, banner.provider)}
              className="relative min-w-0 overflow-hidden rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer group"
            >
              <picture>
                <source media="(max-width: 767px)" srcSet={mobileImage} />
                <img
                  src={banner.imagem_url}
                  alt={banner.titulo || banner.game_name}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </picture>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
