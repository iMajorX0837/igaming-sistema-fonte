import { supabase } from './supabase';

/** Seções carregadas num único request compartilhado entre hooks da home/sidebar. */
export const CMS_ITEM_SECTIONS = [
  'home_banner',
  'quick_nav',
  'recommended',
  'sidebar_category',
  'sidebar_menu_item',
  'sidebar_card',
] as const;

export type CmsItemSection = (typeof CMS_ITEM_SECTIONS)[number];

export type CmsItemRow = Record<string, unknown> & {
  id: string | number;
  secao: string;
  ativo?: boolean;
  ordem?: number;
};

let cachedRows: CmsItemRow[] | null = null;
let inflight: Promise<CmsItemRow[]> | null = null;

async function fetchFromNetwork(): Promise<CmsItemRow[]> {
  const { data, error } = await supabase
    .from('cms_items')
    .select('*')
    .in('secao', [...CMS_ITEM_SECTIONS])
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (error) {
    console.error('Erro ao buscar cms_items:', error);
    return [];
  }

  return (data ?? []) as CmsItemRow[];
}

/** Um único fetch compartilhado; hooks filtram a seção localmente. */
export function fetchAllCmsItemsCached(): Promise<CmsItemRow[]> {
  if (cachedRows) return Promise.resolve(cachedRows);
  if (inflight) return inflight;

  inflight = fetchFromNetwork()
    .then((rows) => {
      cachedRows = rows;
      return rows;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function invalidateCmsItemsCache(): void {
  cachedRows = null;
}

export function filterCmsItemsBySection(section: CmsItemSection | CmsItemSection[]): CmsItemRow[] {
  if (!cachedRows) return [];
  const sections = Array.isArray(section) ? section : [section];
  return cachedRows.filter((row) => sections.includes(row.secao as CmsItemSection));
}
