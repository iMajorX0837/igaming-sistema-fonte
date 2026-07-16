import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type HomeSectionType = 'estudios' | 'recomendados' | 'jogos_semana' | 'jogos_pg' | 'jogos_mesa' | 'jogos_turbo';

export interface HomeSection {
  id: string;
  slug: string;
  titulo: string;
  tipo: HomeSectionType;
  ordem: number;
  ativo: boolean;
  view_all_link: string | null;
  use_green_button: boolean;
}

export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  { id: 'default-recomendados', slug: 'recomendados', titulo: 'Recomendados', tipo: 'recomendados', ordem: 1, ativo: true, view_all_link: null, use_green_button: false },
  { id: 'default-jogos-semana', slug: 'jogos-semana', titulo: '+ Jogados da Semana', tipo: 'jogos_semana', ordem: 2, ativo: true, view_all_link: '/games', use_green_button: false },
  { id: 'default-jogos-pg', slug: 'jogos-pg', titulo: 'Jogos da PG', tipo: 'jogos_pg', ordem: 3, ativo: true, view_all_link: '/provider/pgsoft', use_green_button: false },
  { id: 'default-jogos-mesa', slug: 'jogos-mesa', titulo: 'Jogos de Mesa', tipo: 'jogos_mesa', ordem: 4, ativo: true, view_all_link: '/provider/pgsoft', use_green_button: false },
  { id: 'default-jogos-turbo', slug: 'jogos-turbo', titulo: 'Jogos Turbo', tipo: 'jogos_turbo', ordem: 5, ativo: true, view_all_link: '/provider/pragmatic', use_green_button: true },
  { id: 'default-estudios', slug: 'estudios', titulo: 'Estúdios', tipo: 'estudios', ordem: 6, ativo: true, view_all_link: '/providers', use_green_button: false },
];

function normalizeSection(row: Record<string, unknown>): HomeSection {
  const tipo = row.tipo;
  const validTipo =
    tipo === 'estudios' ||
    tipo === 'recomendados' ||
    tipo === 'jogos_semana' ||
    tipo === 'jogos_pg' ||
    tipo === 'jogos_mesa' ||
    tipo === 'jogos_turbo'
      ? tipo
      : 'recomendados';

  return {
    id: String(row.id),
    slug: String(row.slug),
    titulo: String(row.titulo),
    tipo: validTipo,
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
    view_all_link: row.view_all_link ? String(row.view_all_link) : null,
    use_green_button: Boolean(row.use_green_button),
  };
}

export function useHomeSections() {
  const [sections, setSections] = useState<HomeSection[]>(DEFAULT_HOME_SECTIONS);
  const [loading, setLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar seções da home:', error);
        setSections(DEFAULT_HOME_SECTIONS);
        return;
      }

      if (!data?.length) {
        setSections(DEFAULT_HOME_SECTIONS);
        return;
      }

      setSections(data.map((row) => normalizeSection(row as Record<string, unknown>)));
    } catch (err) {
      console.error('Erro ao buscar seções da home:', err);
      setSections(DEFAULT_HOME_SECTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSections();
  }, [fetchSections]);

  return { sections, loading, refresh: fetchSections };
}
