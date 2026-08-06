import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { initMetaPixels, trackMetaPageView } from '../lib/metaPixel';

let cachedPixelIds: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

async function fetchActivePixelIds(): Promise<string[]> {
  if (cachedPixelIds) return cachedPixelIds;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const { data, error } = await supabase
      .from('tracking_pixels')
      .select('pixel_id')
      .eq('ativo', true)
      .eq('plataforma', 'facebook')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar pixels de tracking:', error);
      return [];
    }

    const ids = (data ?? [])
      .map((row) => String(row.pixel_id ?? '').trim())
      .filter(Boolean);

    cachedPixelIds = ids;
    return ids;
  })();

  return fetchPromise;
}

export default function MetaPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    void fetchActivePixelIds().then((pixelIds) => initMetaPixels(pixelIds));
  }, []);

  useEffect(() => {
    trackMetaPageView();
  }, [location.pathname]);

  return null;
}
