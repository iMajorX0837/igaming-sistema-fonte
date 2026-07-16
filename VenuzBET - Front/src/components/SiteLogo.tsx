import type { ImgHTMLAttributes } from 'react';
import { useHeaderConfig } from '../hooks/useHeaderConfig';
import { DEFAULT_HEADER_CONFIG } from '../lib/siteConfigCache';

interface SiteLogoProps extends ImgHTMLAttributes<HTMLImageElement> {}

export default function SiteLogo({ alt = 'RoyalBet', ...props }: SiteLogoProps) {
  const { config } = useHeaderConfig();

  return (
    <img
      src={config.logo_url || DEFAULT_HEADER_CONFIG.logo_url}
      alt={alt}
      {...props}
    />
  );
}
