import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSiteBrand } from './useSiteBrand';
import { getOriginaisLabel, mapProprietaryProviderLabel } from '../lib/siteBrand';

export interface AllGamesPageConfig {
  titulo: string;
  jogos_por_pagina: number;
}

export interface AllGamesProviderFilter {
  id: string;
  slug: string;
  nome: string;
  api_provider_id: number | null;
  ordem: number;
  ativo: boolean;
}

export interface AllGamesCategoryFilter {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export const DEFAULT_ALL_GAMES_PAGE_CONFIG: AllGamesPageConfig = {
  titulo: 'Todos os jogos',
  jogos_por_pagina: 18,
};

export const DEFAULT_ALL_GAMES_PROVIDERS: AllGamesProviderFilter[] = [
  { id: 'default-all', slug: 'all', nome: 'Todos', api_provider_id: null, ordem: 1, ativo: true },
  { id: 'default-venuzbet', slug: 'venuzbet', nome: getOriginaisLabel(), api_provider_id: null, ordem: 2, ativo: true },
  { id: 'default-pgsoft', slug: 'pgsoft', nome: 'PG Soft', api_provider_id: 1, ordem: 3, ativo: true },
  { id: 'default-pragmatic', slug: 'pragmatic', nome: 'Pragmatic Play', api_provider_id: null, ordem: 4, ativo: true },
  { id: 'default-pragmaticlive', slug: 'pragmaticlive', nome: 'Pragmatic Live', api_provider_id: null, ordem: 5, ativo: true },
  { id: 'default-netent', slug: 'netent', nome: 'NetEnt', api_provider_id: null, ordem: 6, ativo: true },
  { id: 'default-evolution', slug: 'evolution', nome: 'Evolution Gaming', api_provider_id: null, ordem: 7, ativo: true },
  { id: 'default-redtiger', slug: 'redtiger', nome: 'Red Tiger', api_provider_id: null, ordem: 8, ativo: true },
  { id: 'default-playson', slug: 'playson', nome: 'Playson', api_provider_id: null, ordem: 9, ativo: true },
  { id: 'default-habanero', slug: 'habanero', nome: 'Habanero', api_provider_id: null, ordem: 10, ativo: true },
  { id: 'default-spribe', slug: 'spribe', nome: 'Spribe', api_provider_id: null, ordem: 11, ativo: true },
  { id: 'default-evoplay', slug: 'evoplay', nome: 'Evoplay', api_provider_id: null, ordem: 12, ativo: true },
  { id: 'default-bgaming', slug: 'bgaming', nome: 'BGaming', api_provider_id: null, ordem: 13, ativo: true },
  { id: 'default-ezugi', slug: 'ezugi', nome: 'Ezugi', api_provider_id: null, ordem: 14, ativo: true },
  { id: 'default-cgames', slug: 'cgames', nome: 'C Games', api_provider_id: null, ordem: 15, ativo: true },
];

export const DEFAULT_ALL_GAMES_CATEGORIES: AllGamesCategoryFilter[] = [
  { id: 'default-all', slug: 'all', nome: 'Todos', ordem: 1, ativo: true },
  { id: 'default-slots', slug: 'slots', nome: 'Slots', ordem: 2, ativo: true },
  { id: 'default-live', slug: 'live', nome: 'Cassino Ao Vivo', ordem: 3, ativo: true },
  { id: 'default-table', slug: 'table', nome: 'Jogos de Mesa', ordem: 4, ativo: true },
  { id: 'default-crash', slug: 'crash', nome: 'Crash Games', ordem: 5, ativo: true },
];

function normalizeProvider(row: Record<string, unknown>): AllGamesProviderFilter {
  return {
    id: String(row.id),
    slug: String(row.slug),
    nome: String(row.nome),
    api_provider_id: row.api_provider_id == null ? null : Number(row.api_provider_id),
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
  };
}

function normalizeCategory(row: Record<string, unknown>): AllGamesCategoryFilter {
  return {
    id: String(row.id),
    slug: String(row.slug),
    nome: String(row.nome),
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
  };
}

function mapProvidersWithBrand(
  rows: AllGamesProviderFilter[],
  nomeBet: string,
): AllGamesProviderFilter[] {
  return rows.map((provider) => ({
    ...provider,
    nome: mapProprietaryProviderLabel(provider.slug, provider.nome, nomeBet),
  }));
}

export function useAllGamesPageConfig() {
  const { nomeBet } = useSiteBrand();
  const [pageConfig, setPageConfig] = useState<AllGamesPageConfig>(DEFAULT_ALL_GAMES_PAGE_CONFIG);
  const [providers, setProviders] = useState<AllGamesProviderFilter[]>(DEFAULT_ALL_GAMES_PROVIDERS);
  const [categories, setCategories] = useState<AllGamesCategoryFilter[]>(DEFAULT_ALL_GAMES_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, providersRes, categoriesRes] = await Promise.all([
        supabase.from('all_games_page_config').select('titulo, jogos_por_pagina').eq('id', 1).maybeSingle(),
        supabase.from('all_games_providers').select('*').eq('ativo', true).order('ordem', { ascending: true }),
        supabase.from('all_games_categories').select('*').eq('ativo', true).order('ordem', { ascending: true }),
      ]);

      if (configRes.error) {
        console.error('Erro ao buscar config todos jogos:', configRes.error);
      } else if (configRes.data) {
        setPageConfig({
          titulo: String(configRes.data.titulo || DEFAULT_ALL_GAMES_PAGE_CONFIG.titulo),
          jogos_por_pagina: Number(configRes.data.jogos_por_pagina) || DEFAULT_ALL_GAMES_PAGE_CONFIG.jogos_por_pagina,
        });
      }

      if (providersRes.error) {
        console.error('Erro ao buscar providers todos jogos:', providersRes.error);
        setProviders(mapProvidersWithBrand(DEFAULT_ALL_GAMES_PROVIDERS, nomeBet));
      } else if (!providersRes.data?.length) {
        setProviders(mapProvidersWithBrand(DEFAULT_ALL_GAMES_PROVIDERS, nomeBet));
      } else {
        setProviders(
          mapProvidersWithBrand(
            providersRes.data.map((row) => normalizeProvider(row as Record<string, unknown>)),
            nomeBet,
          ),
        );
      }

      if (categoriesRes.error) {
        console.error('Erro ao buscar categorias todos jogos:', categoriesRes.error);
        setCategories(DEFAULT_ALL_GAMES_CATEGORIES);
      } else if (!categoriesRes.data?.length) {
        setCategories(DEFAULT_ALL_GAMES_CATEGORIES);
      } else {
        setCategories(categoriesRes.data.map((row) => normalizeCategory(row as Record<string, unknown>)));
      }
    } catch (err) {
      console.error('Erro ao buscar config todos jogos:', err);
      setPageConfig(DEFAULT_ALL_GAMES_PAGE_CONFIG);
      setProviders(mapProvidersWithBrand(DEFAULT_ALL_GAMES_PROVIDERS, nomeBet));
      setCategories(DEFAULT_ALL_GAMES_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [nomeBet]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  return { pageConfig, providers, categories, loading, refresh: fetchConfig };
}
