import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useHomeConfig } from '../hooks/useHomeConfig';

interface Provider {
  name: string;
  image: string;
  href: string;
}

interface ProviderSliderProps {
  title?: string;
  viewAllLink?: string;
  providers: Provider[];
}

export default function ProviderSlider({ title = 'Estúdios', viewAllLink = '/providers', providers }: ProviderSliderProps) {
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

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    // Só adiciona listeners se houver provedores
    if (!providers || providers.length === 0) {
      return;
    }

    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [providers]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 214; // 190px (width) + 24px (gap)
      scrollContainerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = 214; // 190px (width) + 24px (gap)
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Se não houver provedores, não renderiza nada ou mostra um estado vazio
  if (!providers || providers.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h4 className="text-white font-bold text-xl tracking-tight">{title}</h4>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={viewAllLink}
            className="px-4 h-9 rounded-lg text-sm font-semibold flex items-center transition-all duration-200 text-slate-300 hover:text-slate-100"
            style={{ backgroundColor: surfaceBg }}
            {...surfaceHoverHandlers}
          >
            Ver Tudo
          </a>
          <button
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

      <div className="relative overflow-hidden rounded-xl">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide"
        >
          {providers.map((provider) => (
            <a
              key={provider.name}
              href={provider.href}
              className="flex-shrink-0 w-[190px] h-[70px] rounded-xl hover:scale-105 transition-all duration-200 relative group"
              style={{ backgroundColor: '#0D1237' }}
            >
              <div
                className="absolute w-[80%] h-[70%] left-[10%] top-[15%] bg-center bg-contain bg-no-repeat opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundImage: `url(${provider.image})` }}
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
