import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useTranslation } from '../hooks/useTranslation';
import { HOME_SECTION_GAMES_MAX } from '../lib/homeSectionGames';

const CARD_WIDTH = 170;
const CARD_HEIGHT = 210;
const NUMBER_BADGE_WIDTH = 48;

const WEEKLY_RANK_IMAGES = Array.from(
  { length: 10 },
  (_, index) => `/assets/imgs/numbers/${index + 1}.webp`
);

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
  games?: Game[];
}

function WeeklyRankBadge({ index }: { index: number }) {
  const rank = index + 1;
  const src = WEEKLY_RANK_IMAGES[index] ?? `/assets/imgs/numbers/${rank}.webp`;

  return (
    <div className="relative z-0 flex h-[210px] w-12 items-center justify-center sm:w-14 md:w-16">
      <img
        src={src}
        alt={String(rank)}
        className="h-full w-auto max-w-none object-contain select-none pointer-events-none"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

export default function WeeklyGamesSlider({
  title,
  viewAllLink = '/games',
  games = [],
}: WeeklyGamesSliderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { config: homeConfig } = useHomeConfig();
  const sectionTitle = title ?? t.home.mostPlayedWeek;
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
  const visibleGames = useMemo(() => games.slice(0, HOME_SECTION_GAMES_MAX), [games]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const nextLeft = scrollLeft > 0;
      const nextRight = scrollLeft < scrollWidth - clientWidth - 10;
      setCanScrollLeft((prev) => (prev === nextLeft ? prev : nextLeft));
      setCanScrollRight((prev) => (prev === nextRight ? prev : nextRight));
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScrollOrResize = () => {
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
  }, [checkScrollability, visibleGames.length]);

  const getScrollStep = () => CARD_WIDTH + NUMBER_BADGE_WIDTH + 16;

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

  if (visibleGames.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
        <h4 className="text-white font-bold text-lg md:text-xl tracking-tight pr-2">{sectionTitle}</h4>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={viewAllLink}
            className="px-3 md:px-4 h-9 rounded-lg text-xs md:text-sm font-semibold flex items-center transition-all duration-200 text-slate-300 hover:text-slate-100"
            style={{ backgroundColor: surfaceBg }}
            {...surfaceHoverHandlers}
          >
            {t.common.seeAll}
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
          {visibleGames.map((game, index) => (
            <div
              key={`${game.game_code}-${game.name}`}
              className="relative flex shrink-0 items-center max-md:snap-start"
            >
              <WeeklyRankBadge index={index} />
              <div
                className="relative z-10 ml-0 sm:ml-0 md:ml-1 group rounded-xl overflow-hidden shadow-xl shrink-0"
                style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
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
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {t.common.playUpper}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
