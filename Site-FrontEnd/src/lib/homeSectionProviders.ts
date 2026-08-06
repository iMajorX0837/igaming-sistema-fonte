import { getProviderSlug } from './homeSectionGames';

export interface HomeSectionProviderDisplay {
  name: string;
  image: string;
  href: string;
  api_provider_id: number;
}

export function mapHomeSectionProviderRow(row: {
  api_provider_id: number;
  provider_name: string;
  provider_image_url: string | null;
}): HomeSectionProviderDisplay {
  const slug = getProviderSlug(row.provider_name);

  return {
    name: row.provider_name,
    image: row.provider_image_url || '',
    href: `/provider/${slug}`,
    api_provider_id: row.api_provider_id,
  };
}
