import { useState, useEffect, useCallback } from 'react';
import Banner from './Banner';
import SearchBar from './SearchBar';
import HomeQuickNav from './HomeQuickNav';
import WinnerSlider from './WinnerSlider';
import RecommendedBanners from './RecommendedBanners';
import ProviderSlider from './ProviderSlider';
import GameSlider from './GameSlider';
import WeeklyGamesSlider from './WeeklyGamesSlider';
import Footer from './Footer';
import { GameInfo } from '../App';
import { homePageContainerClass } from '../constants/homeLayout';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverSlotsProvider } from '../api/playfiversCache';
import { useHomeSections, type HomeSection } from '../hooks/useHomeSections';
import { useHomeConfig } from '../hooks/useHomeConfig';
import {
  PROPRIETARY_PROVIDER,
  PROPRIETARY_PROVIDER_ID,
} from '../lib/proprietaryCatalog';
import {
  ensurePlatformGameSettingsLoaded,
  isPlatformProviderEnabled,
} from '../lib/platformGames';

interface MainContentProps {
  onGameSelect: (game: GameInfo) => void;
}

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
  image_url: string;
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

interface GameWithCode {
  name: string;
  provider: string;
  image: string;
  href: string;
  game_code?: string;
}

interface Provider {
  name: string;
  image: string;
  href: string;
}

export default function MainContent({ onGameSelect }: MainContentProps) {
  const { sections: homeSections } = useHomeSections();
  const { config: homeConfig } = useHomeConfig();
  const [maisJogadosGames, setMaisJogadosGames] = useState<GameWithCode[]>([]);
  const [mesaGames, setMesaGames] = useState<GameWithCode[]>([]);
  const [turboGames, setTurboGames] = useState<GameWithCode[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  // Função para criar slug de URL (normalizar para URL-friendly)
  const createSlug = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres não alfanuméricos por hífen
      .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
  }, []);

  // Função para obter o slug do provider baseado no nome
  const getProviderSlug = useCallback((providerName: string): string => {
    const providerMap: { [key: string]: string } = {
      'PG Soft': 'pgsoft',
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
    
    const trimmed = providerName.trim();
    if (providerMap[trimmed]) return providerMap[trimmed];

    const lower = trimmed.toLowerCase();
    if (lower.includes('pragmatic') && lower.includes('live')) return 'pragmaticlive';
    if (lower.includes('pragmatic')) return 'pragmatic';
    if (lower.includes('pg soft') || lower.includes('pgsoft')) return 'pgsoft';

    return createSlug(trimmed);
  }, [createSlug]);

  const fetchPGSoftGames = useCallback(async (limit: number = 12, offset: number = 0) => {
    try {
      const providersData: ApiProvidersResponse = await fetchProvidersCached();
      
      if (providersData.status !== 1 || !providersData.data) {
        return [];
      }
      
      const filteredProviders = providersData.data.filter(isPlayFiverSlotsProvider);
      
      // Encontrar o provedor PG Soft
      const pgSoftProvider = filteredProviders.find(
        prov => prov.name.toLowerCase().includes('pg soft') || prov.name.toLowerCase().includes('pgsoft')
      );
      
      if (!pgSoftProvider) {
        return [];
      }
      
      const gamesData: ApiResponse = await fetchGamesForProviderCached(pgSoftProvider.id);
      
      if (gamesData.status !== 1 || !gamesData.data) {
        return [];
      }
      
      // Filtrar apenas jogos ativos e pegar uma fatia diferente baseada no offset
      const activeGames = gamesData.data
        .filter(game => game.status === true)
        .slice(offset, offset + limit)
        .map(game => {
          const providerSlug = getProviderSlug(game.provider.name);
          const gameSlug = createSlug(game.name);
          return {
            name: game.name,
            provider: game.provider.name,
            image: game.image_url,
            href: `/${providerSlug}/${gameSlug}`,
            game_code: game.game_code,
          };
        });
      
      return activeGames;
    } catch (err) {
      console.error('Erro ao buscar jogos do PG Soft:', err);
      return [];
    }
  }, [createSlug, getProviderSlug]);

  const fetchPragmaticGames = useCallback(async (limit: number = 12, offset: number = 0) => {
    try {
      const providersData: ApiProvidersResponse = await fetchProvidersCached();
      
      if (providersData.status !== 1 || !providersData.data) {
        return [];
      }
      
      const filteredProviders = providersData.data.filter(isPlayFiverSlotsProvider);
      
      // Encontrar o provedor Pragmatic Play (exclui Pragmatic Live)
      const pragmaticProvider = filteredProviders.find((prov) => {
        const name = prov.name.toLowerCase();
        return name.includes('pragmatic play') || (name.includes('pragmatic') && !name.includes('live'));
      });
      
      if (!pragmaticProvider) {
        return [];
      }
      
      const gamesData: ApiResponse = await fetchGamesForProviderCached(pragmaticProvider.id);
      
      if (gamesData.status !== 1 || !gamesData.data) {
        return [];
      }
      
      // Filtrar apenas jogos ativos e pegar uma fatia diferente baseada no offset
      const activeGames = gamesData.data
        .filter(game => game.status === true)
        .slice(offset, offset + limit)
        .map(game => {
          const providerSlug = getProviderSlug(game.provider.name);
          const gameSlug = createSlug(game.name);
          return {
            name: game.name,
            provider: game.provider.name,
            image: game.image_url,
            href: `/${providerSlug}/${gameSlug}`,
            game_code: game.game_code,
          };
        });
      
      return activeGames;
    } catch (err) {
      console.error('Erro ao buscar jogos do Pragmatic Play:', err);
      return [];
    }
  }, [createSlug, getProviderSlug]);

  const fetchProviders = useCallback(async () => {
    try {
      const apiData: ApiProvidersResponse = await fetchProvidersCached();
      
      if (apiData.status === 1 && apiData.data) {
        const filteredProviders = apiData.data.filter(isPlayFiverSlotsProvider);
        
        // Mapear para o formato esperado
        const mappedProviders: Provider[] = filteredProviders.map(provider => ({
          name: provider.name,
          image: provider.image_url || '',
          href: `/provider/${getProviderSlug(provider.name)}`,
        }));

        const settings = await ensurePlatformGameSettingsLoaded();
        const hasApiSpribe = mappedProviders.some(
          (provider) => getProviderSlug(provider.name) === PROPRIETARY_PROVIDER.slug
        );

        if (
          isPlatformProviderEnabled(PROPRIETARY_PROVIDER_ID, settings) &&
          !hasApiSpribe
        ) {
          mappedProviders.unshift({
            name: PROPRIETARY_PROVIDER.name,
            image: PROPRIETARY_PROVIDER.image_url,
            href: `/provider/${PROPRIETARY_PROVIDER.slug}`,
          });
        }

        setProviders(mappedProviders);
      }
    } catch (err) {
      console.error('Erro ao buscar provedores:', err);
    }
  }, [getProviderSlug]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  useEffect(() => {
    // Buscar 12 jogos do PG Soft para "🔥 +Jogados da Semana" (primeiros 12)
    fetchPGSoftGames(12, 0).then(setMaisJogadosGames);

    // Buscar 12 jogos diferentes do PG Soft para "🎲 Jogos de Mesa" (próximos 12)
    fetchPGSoftGames(12, 12).then(setMesaGames);

    // Buscar 12 jogos do Pragmatic Play para "✈ Jogos Turbo"
    fetchPragmaticGames(12, 0).then(setTurboGames);
  }, [fetchPGSoftGames, fetchPragmaticGames]);

  const renderHomeSection = (section: HomeSection) => {
    switch (section.tipo) {
      case 'recomendados':
        return <RecommendedBanners title={section.titulo} />;
      case 'jogos_semana':
        return (
          <WeeklyGamesSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/games'}
          />
        );
      case 'jogos_pg':
        return (
          <GameSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/provider/pgsoft'}
            games={maisJogadosGames}
            useGreenButton={section.use_green_button}
          />
        );
      case 'jogos_mesa':
        return (
          <GameSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/provider/pgsoft'}
            games={mesaGames}
            useGreenButton={section.use_green_button}
          />
        );
      case 'jogos_turbo':
        return (
          <GameSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/provider/pragmatic'}
            games={turboGames}
            useGreenButton={section.use_green_button}
          />
        );
      case 'estudios':
        return (
          <ProviderSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/providers'}
            providers={providers}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ backgroundColor: homeConfig.fundo }}>
      <div className={homePageContainerClass}>
        <div className="py-4 sm:py-6">
          <Banner />

          <div className="mt-2">
            <SearchBar onGameSelect={onGameSelect} />
          </div>

          <div className="mt-6">
            <HomeQuickNav />
          </div>

          <div className="mt-4">
            <WinnerSlider onGameSelect={onGameSelect} />
          </div>

          {homeSections.map((section) => {
            const content = renderHomeSection(section);
            if (!content) return null;

            return (
              <div key={section.id} className="mt-2">
                {content}
              </div>
            );
          })}
        </div>

        <Footer containerClassName="w-full" />
      </div>
    </div>
  );
}
