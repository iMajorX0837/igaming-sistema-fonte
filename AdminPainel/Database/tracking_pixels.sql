-- Pixels de tracking (Facebook Meta Pixel — PageView no frontend do cassino)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.tracking_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  plataforma TEXT NOT NULL DEFAULT 'facebook',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tracking_pixels_plataforma_check CHECK (plataforma IN ('facebook')),
  CONSTRAINT tracking_pixels_pixel_id_format CHECK (pixel_id ~ '^[0-9]{10,20}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_pixels_pixel_id
  ON public.tracking_pixels (pixel_id);

CREATE INDEX IF NOT EXISTS idx_tracking_pixels_ativo
  ON public.tracking_pixels (ativo, plataforma);

ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico ve tracking pixels ativos" ON public.tracking_pixels;
DROP POLICY IF EXISTS "Admin gerencia tracking pixels" ON public.tracking_pixels;

CREATE POLICY "Publico ve tracking pixels ativos"
  ON public.tracking_pixels FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia tracking pixels"
  ON public.tracking_pixels FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.tracking_pixels TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_tracking_pixels ON public.tracking_pixels;
CREATE TRIGGER set_updated_at_tracking_pixels
  BEFORE UPDATE ON public.tracking_pixels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
