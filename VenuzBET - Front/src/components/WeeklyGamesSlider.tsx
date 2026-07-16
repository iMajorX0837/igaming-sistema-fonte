import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverSlotsProvider } from '../api/playfiversCache';
import LoadingScreen from './LoadingScreen';

const WEEKLY_NUMBER_IMAGES = Array.from(
  { length: 10 },
  (_, i) => `https://royalbetsolutions.com/_ipx/_/assets/imgs/numbers/${i + 1}.webp`
);
const CARD_WIDTH = 170;
const CARD_HEIGHT = 210;
const NUMBER_BADGE_WIDTH = 48;
const CARD_OVERLAP = 32;
const GAMES_COUNT = 10;

const MOBILE_MAX = 767;
const MOBILE_GAP_PX = 8;

interface Game {
  name: string;
  provider: string;
  image: string;
  href: string;
  game_code?: string;
}

interface WeeklyGamesSliderProps {
  title?: string;
  viewAllLink?: string;
}

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

const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getProviderSlug = (providerName: string): string => {
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
  };

  return providerMap[providerName] || createSlug(providerName);
};

function shuffleGames<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
}

export default function WeeklyGamesSlider({
  title = '+ Jogados da Semana',
  viewAllLink = '/games',
}: WeeklyGamesSliderProps) {
  const navigate = useNavigate();
  const { config: homeConfig } = useHomeConfig();
  const surfaceBg = `color-mix(in srgb, ${homeConfig.fundo} 88%, black)`;
  const hoverBg = homeConfig.fundo;
  const surfaceHoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = hoverBg;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = surfaceBg;
    },
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mobileCard, setMobileCard] = useState({ w: 104, h: 128 });
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches : false
  );

  const fetchRandomGames = useCallback(async () => {
    setIsLoading(true);

    try {
      const providersData: ApiProvidersResponse = await fetchProvidersCached();

      if (providersData.status !== 1 || !providersData.data) {
        setGames([]);
        return;
      }

      const filteredProviders = providersData.data.filter(isPlayFiverSlotsProvider);

      const gamesPromises = filteredProviders.map(async (prov) => {
        try {
          const apiData: ApiResponse = await fetchGamesForProviderCached(prov.id);

          if (apiData.status === 1 && apiData.data) {
            return apiData.data
              .filter((game) => game.status === true)
              .map((game) => {
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
          }
          return [];
        } catch (err) {
          console.error(`Erro ao buscar jogos do provider ${prov.name}:`, err);
          return [];
        }
      });

      const gamesResults = await Promise.all(gamesPromises);
      const allGames = gamesResults.flat();
      const selectedGames = shuffleGames(allGames).slice(0, GAMES_COUNT);

      setGames(selectedGames);
    } catch (err) {
      console.error('Erro ao buscar jogos da semana:', err);
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRandomGames();
  }, [fetchRandomGames]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const checkScrollability = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateMobileCardWidth = () => {
      if (!isMobileViewport()) return;
      const cw = container.clientWidth;
      const w = Math.max(72, Math.floor((cw - MOBILE_GAP_PX * 2) / 3));
      const h = Math.round((w * CARD_HEIGHT) / CARD_WIDTH);
      setMobileCard({ w, h });
    };

    const onScrollOrResize = () => {
      updateMobileCardWidth();
      checkScrollability();
    };

    onScrollOrResize();
    const ro = new ResizeObserver(onScrollOrResize);
    ro.observe(container);
    container.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      ro.disconnect();
      container.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [games, checkScrollability]);

  const getScrollStep = () => {
    const el = scrollContainerRef.current;
    if (!el) return CARD_WIDTH + NUMBER_BADGE_WIDTH - CARD_OVERLAP + 16;
    if (isMobileViewport()) {
      return el.clientWidth;
    }
    return CARD_WIDTH + NUMBER_BADGE_WIDTH - CARD_OVERLAP + 16;
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({
      left: -getScrollStep(),
      behavior: 'smooth',
    });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({
      left: getScrollStep(),
      behavior: 'smooth',
    });
  };

  const handleGameClick = (game: Game) => {
    sessionStorage.setItem('previousPath', window.location.pathname);
    sessionStorage.setItem(
      'gameData',
      JSON.stringify({
        name: game.name,
        provider: game.provider,
        image: game.image,
        game_code: game.game_code,
      })
    );
    navigate(game.href);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
        <h4 className="text-white font-bold text-lg md:text-xl tracking-tight pr-2">{title}</h4>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={viewAllLink}
            className="px-3 md:px-4 h-9 rounded-lg text-xs md:text-sm font-semibold flex items-center transition-all duration-200 text-slate-300 hover:text-slate-100"
            style={{ backgroundColor: surfaceBg }}
            {...surfaceHoverHandlers}
          >
            Ver Tudo
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                canScrollLeft
                  ? 'text-slate-300 hover:text-slate-100 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
              style={{ backgroundColor: surfaceBg }}
              {...(canScrollLeft ? surfaceHoverHandlers : {})}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              disabled={!canScrollRight}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                canScrollRight
                  ? 'text-slate-300 hover:text-slate-100 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed opacity-50'
              }`}
              style={{ backgroundColor: surfaceBg }}
              {...(canScrollRight ? surfaceHoverHandlers : {})}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingScreen title="Carregando jogos..." variant="inline" />
      ) : (
        <div className="relative overflow-hidden rounded-xl">
          <div
            ref={scrollContainerRef}
            className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide pb-2 max-md:snap-x max-md:snap-mandatory"
          >
            {games.map((game, index) => (
              <div
                key={`${game.game_code}-${game.name}`}
                className="relative flex shrink-0 items-center max-md:snap-start"
              >
                <img
                  src={WEEKLY_NUMBER_IMAGES[index]}
                  alt={`${index + 1}`}
                  className="relative z-0 h-[128px] w-auto object-contain sm:h-[170px] md:h-[210px]"
                  loading="lazy"
                />
                <div
                  className="relative z-10 -ml-5 sm:-ml-6 md:-ml-8 group rounded-xl overflow-hidden shadow-xl"
                  style={
                    narrow
                      ? { width: mobileCard.w, height: mobileCard.h }
                      : { width: CARD_WIDTH, height: CARD_HEIGHT }
                  }
                >
                  <div
                    className="w-full h-full bg-center bg-cover"
                    style={{ backgroundImage: `url(${game.image})` }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleGameClick(game);
                      }}
                      className="font-bold text-xs px-3 py-1.5 rounded border flex items-center gap-1 hover:brightness-110 transition-all"
                      style={{ backgroundColor: '#7B3FF2', borderColor: '#9B5FF2', color: '#000000' }}
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      JOGAR
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
