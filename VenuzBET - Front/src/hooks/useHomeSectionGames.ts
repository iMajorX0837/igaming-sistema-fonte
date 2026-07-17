import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { mapHomeSectionGameRow, type HomeSectionGameDisplay } from '../lib/homeSectionGames';

export function useHomeSectionGames() {
  const [gamesBySectionId, setGamesBySectionId] = useState<Record<string, HomeSectionGameDisplay[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_section_games')
        .select('section_id, game_name, game_image_url, provider_name, game_code, ordem')
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar jogos das seções da home:', error);
        setGamesBySectionId({});
        return;
      }

      const grouped: Record<string, HomeSectionGameDisplay[]> = {};
      for (const row of data || []) {
        const sectionId = String(row.section_id);
        if (!grouped[sectionId]) grouped[sectionId] = [];
        grouped[sectionId].push(
          mapHomeSectionGameRow({
            game_name: String(row.game_name),
            game_image_url: row.game_image_url ? String(row.game_image_url) : null,
            provider_name: String(row.provider_name),
            game_code: String(row.game_code),
          })
        );
      }

      setGamesBySectionId(grouped);
    } catch (err) {
      console.error('Erro ao buscar jogos das seções da home:', err);
      setGamesBySectionId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGames();
  }, [fetchGames]);

  return { gamesBySectionId, loading, refresh: fetchGames };
}
