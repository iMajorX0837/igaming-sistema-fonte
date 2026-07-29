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

const STORAGE_KEY = 'venuz-home-sections-v2';

function readCachedSections(): HomeSection[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeSection[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistSections(sections: HomeSection[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
  } catch {
    // ignore quota / private mode
  }
}

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
  const [sections, setSections] = useState<HomeSection[]>(() => readCachedSections() ?? []);
  const [loading, setLoading] = useState(() => !readCachedSections());

  const fetchSections = useCallback(async () => {
    const hasCache = (readCachedSections()?.length ?? 0) > 0;
    if (!hasCache) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('home_sections')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar seções da home:', error);
        if (!hasCache) setSections([]);
        return;
      }

      const next = (data ?? []).map((row) => normalizeSection(row as Record<string, unknown>));
      setSections(next);
      persistSections(next);
    } catch (err) {
      console.error('Erro ao buscar seções da home:', err);
      if (!hasCache) setSections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSections();
  }, [fetchSections]);

  return { sections, loading, refresh: fetchSections };
}
