import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { openCmsLink } from '../lib/cmsLink';
import { useRecommendedBanners, type RecommendedBanner } from '../hooks/useRecommendedBanners';

export default function RecommendedBanners({ title = 'Recomendados' }: { title?: string }) {
  const navigate = useNavigate();
  const { banners, loading } = useRecommendedBanners();

  const handleBannerClick = useCallback(
    (banner: RecommendedBanner) => {
      openCmsLink(banner.href, banner.link_tipo, navigate);
    },
    [navigate]
  );

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
              className={`relative min-w-0 overflow-hidden rounded-lg sm:rounded-xl shadow-lg transition-shadow duration-300 group ${
                hasLink ? 'cursor-pointer hover:shadow-xl' : 'cursor-default'
              }`}
            >
              <picture>
                <source media="(max-width: 767px)" srcSet={mobileImage} />
                <img
                  src={banner.imagem_url}
                  alt={banner.titulo || 'Banner recomendado'}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </picture>
              {hasLink && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
