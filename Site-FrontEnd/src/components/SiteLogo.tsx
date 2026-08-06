import type { ImgHTMLAttributes } from 'react';
import { useHeaderConfig } from '../hooks/useHeaderConfig';
import { useSiteBrand } from '../hooks/useSiteBrand';
import { DEFAULT_HEADER_CONFIG } from '../lib/siteConfigCache';

interface SiteLogoProps extends ImgHTMLAttributes<HTMLImageElement> {}

export default function SiteLogo({ alt, ...props }: SiteLogoProps) {
  const { config } = useHeaderConfig();
  const { nomeBet } = useSiteBrand();

  return (
    <img
      src={config.logo_url || DEFAULT_HEADER_CONFIG.logo_url}
      alt={alt ?? nomeBet}
      {...props}
    />
  );
}
