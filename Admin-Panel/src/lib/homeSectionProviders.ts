export interface HomeSectionProviderRow {
  id: string;
  section_id: string;
  api_provider_id: number;
  provider_name: string;
  provider_image_url: string | null;
  ordem: number;
}

export interface CatalogProviderOption {
  key: string;
  api_provider_id: number;
  provider_name: string;
  provider_image_url: string;
}

export function catalogProviderKey(apiProviderId: number): string {
  return String(apiProviderId);
}

export function isEstudiosSectionType(tipo: string): boolean {
  return tipo === 'estudios';
}
