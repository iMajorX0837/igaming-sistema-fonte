import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { HOME_SECTION_GAMES_MAX } from '../lib/homeSectionGames';

interface Game {
  name: string;
  provider: string;
  image: string;
  href: string;
  game_code?: string;
}

interface GameSliderProps {
  title: string;
  viewAllLink: string;
  games: Game[];
  useGreenButton?: boolean;
}

// Função para criar slug de URL (normalizar para URL-friendly)
const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
};

// Função para obter o slug do provider baseado no nome
const getProviderSlug = (providerName: string): string => {
  // Mapear nomes conhecidos para slugs
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

const MOBILE_MAX = 767;
const MOBILE_GAP_PX = 8; // gap-2

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
}

export default function GameSlider({ title, viewAllLink, games, useGreenButton = false }: GameSliderProps) {
  const navigate = useNavigate();
  const visibleGames = games.slice(0, HOME_SECTION_GAMES_MAX);
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
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [mobileCard, setMobileCard] = useState({ w: 104, h: 143 });
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches : false
  );

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
      const h = Math.round((w * 220) / 160);
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
  }, [visibleGames, checkScrollability]);

  const getScrollStep = () => {
    const el = scrollContainerRef.current;
    if (!el) return 176;
    if (isMobileViewport()) {
      return el.clientWidth;
    }
    return 176;
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
    // Salvar a rota atual antes de navegar
    sessionStorage.setItem('previousPath', window.location.pathname);
    
    // Criar URL dinâmica
    const providerSlug = getProviderSlug(game.provider);
    const gameSlug = createSlug(game.name);
    const gameUrl = `/${providerSlug}/${gameSlug}`;
    
    // Salvar dados do jogo no sessionStorage para a rota usar
    sessionStorage.setItem('gameData', JSON.stringify({
      name: game.name,
      provider: game.provider,
      image: game.image,
      game_code: game.game_code,
      path: gameUrl,
    }));
    
    navigate(gameUrl);
  };

  if (visibleGames.length === 0) {
    return null;
  }

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

      <div className="relative overflow-hidden rounded-xl">
        <div
          ref={scrollContainerRef}
          className="flex gap-2 md:gap-4 overflow-x-auto scrollbar-hide pb-2 max-md:snap-x max-md:snap-mandatory"
        >
          {visibleGames.map((game) => (
            <div
              key={game.name}
              className="relative group flex-shrink-0 rounded-xl overflow-hidden shadow-xl max-md:snap-start md:w-[160px] md:h-[220px]"
              style={narrow ? { width: mobileCard.w, height: mobileCard.h } : undefined}
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
                  style={{ backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary-light)', color: '#000000' }}
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  JOGAR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
