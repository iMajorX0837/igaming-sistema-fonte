import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openCmsLink } from '../lib/cmsLink';
import { useRecommendedBanners, type RecommendedBanner } from '../hooks/useRecommendedBanners';
import { useHomeConfig } from '../hooks/useHomeConfig';

const MOBILE_BANNER_WIDTH = 249;
const MOBILE_SCROLL_GAP = 8;
const MOBILE_SCROLL_STEP = MOBILE_BANNER_WIDTH + MOBILE_SCROLL_GAP;

const bannersLayoutClass =
  'flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1 max-md:snap-x max-md:snap-mandatory md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0';

const bannerItemClass =
  'max-md:shrink-0 max-md:snap-start max-md:w-[249px] max-md:h-[74px] md:w-auto md:shrink';

export default function RecommendedBanners({ title = 'Recomendados' }: { title?: string }) {
  const navigate = useNavigate();
  const { banners, loading } = useRecommendedBanners();
  const { config: homeConfig } = useHomeConfig();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScrollability();

    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);

    const ro = new ResizeObserver(checkScrollability);
    ro.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
      ro.disconnect();
    };
  }, [banners.length, loading, checkScrollability]);

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({
      left: -MOBILE_SCROLL_STEP,
      behavior: 'smooth',
    });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({
      left: MOBILE_SCROLL_STEP,
      behavior: 'smooth',
    });
  };

  const handleBannerClick = useCallback(
    (banner: RecommendedBanner) => {
      openCmsLink(banner.href, banner.link_tipo, navigate);
    },
    [navigate]
  );

  const showMobileArrows = banners.length > 1;

  const renderBanner = (banner: RecommendedBanner) => {
    const mobileImage = banner.imagem_mobile_url || banner.imagem_url;
    const hasLink = Boolean(banner.href?.trim());

    return (
      <div
        key={banner.id}
        role={hasLink ? 'link' : undefined}
        tabIndex={hasLink ? 0 : undefined}
        onClick={() => handleBannerClick(banner)}
        onKeyDown={(event) => {
          if (!hasLink) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleBannerClick(banner);
          }
        }}
        className={`relative min-w-0 overflow-hidden rounded-lg sm:rounded-xl shadow-lg transition-shadow duration-300 group ${bannerItemClass} ${
          hasLink ? 'cursor-pointer hover:shadow-xl' : 'cursor-default'
        }`}
      >
        <picture>
          <source media="(max-width: 767px)" srcSet={mobileImage} />
          <img
            src={banner.imagem_url}
            alt={banner.titulo || 'Banner recomendado'}
            className="h-full w-full object-cover md:h-auto"
            loading="lazy"
          />
        </picture>
        {hasLink && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <h4 className="text-white font-bold text-xl tracking-tight mb-4 mt-0">{title}</h4>
        <div className={bannersLayoutClass}>
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className={`rounded-lg sm:rounded-xl bg-slate-800/40 animate-pulse md:aspect-[4/3] ${bannerItemClass}`}
            />
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
      <div className="mb-4 mt-0 flex items-center justify-between gap-3">
        <h4 className="text-white font-bold text-xl tracking-tight">{title}</h4>
        {showMobileArrows && (
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              aria-label="Banner anterior"
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                canScrollLeft
                  ? 'cursor-pointer text-slate-300 hover:text-slate-100'
                  : 'cursor-not-allowed text-slate-600 opacity-50'
              }`}
              style={{ backgroundColor: surfaceBg }}
              {...(canScrollLeft ? surfaceHoverHandlers : {})}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              disabled={!canScrollRight}
              aria-label="Próximo banner"
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ${
                canScrollRight
                  ? 'cursor-pointer text-slate-300 hover:text-slate-100'
                  : 'cursor-not-allowed text-slate-600 opacity-50'
              }`}
              style={{ backgroundColor: surfaceBg }}
              {...(canScrollRight ? surfaceHoverHandlers : {})}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="relative overflow-hidden">
        <div ref={scrollContainerRef} className={bannersLayoutClass}>
          {banners.map(renderBanner)}
        </div>
      </div>
    </div>
  );
}
