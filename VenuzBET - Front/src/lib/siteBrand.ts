export const DEFAULT_NOME_BET = 'RoyalBet';
export const DEFAULT_SITE_TITULO = `${DEFAULT_NOME_BET} | Apostas Online com Saques Rápidos`;

export const PROPRIETARY_PROVIDER_SLUGS = new Set(['venuzbet', 'venuz']);

export interface SiteBrandDocument {
  nome_bet: string;
  site_titulo: string;
}

export function normalizeNomeBet(value: unknown): string {
  const trimmed = String(value ?? '').trim();
  return trimmed || DEFAULT_NOME_BET;
}

export function normalizeSiteTitulo(value: unknown, nomeBet: string = DEFAULT_NOME_BET): string {
  const trimmed = String(value ?? '').trim();
  if (trimmed) return trimmed;
  const brand = normalizeNomeBet(nomeBet);
  return `${brand} | Apostas Online com Saques Rápidos`;
}

export function getOriginaisLabel(nomeBet: string = DEFAULT_NOME_BET): string {
  return `${normalizeNomeBet(nomeBet)} Originais`;
}

/** Ajusta rótulos de provedores próprios (venuzbet/venuz) para o nome configurado. */
export function mapProprietaryProviderLabel(
  slug: string,
  nome: string,
  nomeBet: string = DEFAULT_NOME_BET
): string {
  const brand = normalizeNomeBet(nomeBet);
  if (slug === 'venuzbet') return getOriginaisLabel(brand);
  if (slug === 'venuz') return brand;
  if (PROPRIETARY_PROVIDER_SLUGS.has(slug)) return brand;
  return nome;
}

export function applyBrandToDocument(brand: SiteBrandDocument | string) {
  if (typeof document === 'undefined') return;

  if (typeof brand !== 'string') {
    const rawNome = String(brand.nome_bet ?? '').trim();
    const rawTitulo = String(brand.site_titulo ?? '').trim();
    if (!rawNome && !rawTitulo) return;
  }

  const nomeBet = typeof brand === 'string' ? normalizeNomeBet(brand) : normalizeNomeBet(brand.nome_bet);
  const siteTitulo =
    typeof brand === 'string'
      ? normalizeSiteTitulo(undefined, nomeBet)
      : normalizeSiteTitulo(brand.site_titulo, nomeBet);

  document.title = siteTitulo;

  const description = `Apostas esportivas e slots de qualidade na ${nomeBet}. Junte-se a nós agora, a diversão é garantida!`;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', description);
}
