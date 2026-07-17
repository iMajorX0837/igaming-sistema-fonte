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
import { fetchProvidersCached, isPlayFiverEnabledProvider } from '../api/playfiversCache';
import { useHomeSections, type HomeSection } from '../hooks/useHomeSections';
import { useHomeSectionGames } from '../hooks/useHomeSectionGames';
import { useHomeSectionProviders } from '../hooks/useHomeSectionProviders';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { getProviderSlug } from '../lib/homeSectionGames';
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

interface Provider {
  name: string;
  image: string;
  href: string;
}

export default function MainContent({ onGameSelect }: MainContentProps) {
  const { sections: homeSections } = useHomeSections();
  const { gamesBySectionId } = useHomeSectionGames();
  const { providersBySectionId } = useHomeSectionProviders();
  const { config: homeConfig } = useHomeConfig();
  const [fallbackProviders, setFallbackProviders] = useState<Provider[]>([]);

  const fetchFallbackProviders = useCallback(async () => {
    try {
      const apiData: ApiProvidersResponse = await fetchProvidersCached();

      if (apiData.status === 1 && apiData.data) {
        const filteredProviders = apiData.data.filter(isPlayFiverEnabledProvider);

        const mappedProviders: Provider[] = filteredProviders.map((provider) => ({
          name: provider.name,
          image: provider.image_url || '',
          href: `/provider/${getProviderSlug(provider.name)}`,
        }));

        const settings = await ensurePlatformGameSettingsLoaded();
        const hasApiSpribe = mappedProviders.some(
          (provider) => getProviderSlug(provider.name) === PROPRIETARY_PROVIDER.slug
        );

        if (isPlatformProviderEnabled(PROPRIETARY_PROVIDER_ID, settings) && !hasApiSpribe) {
          mappedProviders.unshift({
            name: PROPRIETARY_PROVIDER.name,
            image: PROPRIETARY_PROVIDER.image_url,
            href: `/provider/${PROPRIETARY_PROVIDER.slug}`,
          });
        }

        setFallbackProviders(mappedProviders);
      }
    } catch (err) {
      console.error('Erro ao buscar provedores:', err);
    }
  }, []);

  useEffect(() => {
    fetchFallbackProviders();
  }, [fetchFallbackProviders]);

  const getEstudiosProviders = useCallback(
    async (section: HomeSection): Promise<Provider[]> => {
      const curated = providersBySectionId[section.id] || [];
      if (curated.length > 0) {
        const settings = await ensurePlatformGameSettingsLoaded();
        return curated
          .filter((provider) => isPlatformProviderEnabled(provider.api_provider_id, settings))
          .map(({ name, image, href }) => ({ name, image, href }));
      }

      return fallbackProviders;
    },
    [providersBySectionId, fallbackProviders]
  );

  const [estudiosProvidersBySection, setEstudiosProvidersBySection] = useState<
    Record<string, Provider[]>
  >({});

  useEffect(() => {
    const estudiosSections = homeSections.filter((section) => section.tipo === 'estudios');
    if (estudiosSections.length === 0) return;

    void (async () => {
      const entries = await Promise.all(
        estudiosSections.map(async (section) => [section.id, await getEstudiosProviders(section)] as const)
      );
      setEstudiosProvidersBySection(Object.fromEntries(entries));
    })();
  }, [homeSections, getEstudiosProviders]);

  const renderHomeSection = (section: HomeSection) => {
    const sectionGames = gamesBySectionId[section.id] || [];

    switch (section.tipo) {
      case 'recomendados':
        return <RecommendedBanners title={section.titulo} />;
      case 'jogos_semana':
        return (
          <WeeklyGamesSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/games'}
            games={sectionGames}
          />
        );
      case 'jogos_pg':
        return (
          <GameSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/provider/pgsoft'}
            games={sectionGames}
            useGreenButton={section.use_green_button}
          />
        );
      case 'jogos_mesa':
        return (
          <GameSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/provider/pgsoft'}
            games={sectionGames}
            useGreenButton={section.use_green_button}
          />
        );
      case 'jogos_turbo':
        return (
          <GameSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/provider/pragmatic'}
            games={sectionGames}
            useGreenButton={section.use_green_button}
          />
        );
      case 'estudios':
        return (
          <ProviderSlider
            title={section.titulo}
            viewAllLink={section.view_all_link || '/providers'}
            providers={estudiosProvidersBySection[section.id] || []}
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
      </div>

      <Footer containerClassName={homePageContainerClass} />
    </div>
  );
}
