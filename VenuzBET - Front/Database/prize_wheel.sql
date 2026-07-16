-- Sistema de Roleta de Prêmios configurável pelo administrador
-- Execute após cupons.sql e cupons_giros.sql no SQL Editor do Supabase

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prize_wheel_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ativo BOOLEAN NOT NULL DEFAULT true,
  titulo_imagem_url TEXT,
  banner_imagem_url TEXT,
  roleta_imagem_url TEXT,
  widget_imagem_url TEXT,
  centro_imagem_url TEXT,
  giros_por_periodo INT NOT NULL DEFAULT 1 CHECK (giros_por_periodo > 0),
  cooldown_horas INT NOT NULL DEFAULT 24 CHECK (cooldown_horas >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.prize_wheel_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_admin TEXT NOT NULL,
  label TEXT NOT NULL,
  cupom_id UUID NOT NULL REFERENCES public.cupons(id) ON DELETE RESTRICT,
  peso INT NOT NULL DEFAULT 1 CHECK (peso > 0),
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_prize_wheel_segments_ordem ON public.prize_wheel_segments(ordem);
CREATE INDEX IF NOT EXISTS idx_prize_wheel_segments_ativo ON public.prize_wheel_segments(ativo) WHERE ativo = true;

CREATE TABLE IF NOT EXISTS public.prize_wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.prize_wheel_segments(id) ON DELETE RESTRICT,
  cupom_id UUID NOT NULL REFERENCES public.cupons(id) ON DELETE RESTRICT,
  cupom_uso_id UUID REFERENCES public.cupom_usos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_prize_wheel_spins_usuario ON public.prize_wheel_spins(usuario_id);
CREATE INDEX IF NOT EXISTS idx_prize_wheel_spins_created ON public.prize_wheel_spins(usuario_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.prize_wheel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_wheel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_wheel_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico ve config roleta ativa" ON public.prize_wheel_config;
DROP POLICY IF EXISTS "Admin gerencia config roleta" ON public.prize_wheel_config;
DROP POLICY IF EXISTS "Publico ve segmentos roleta ativos" ON public.prize_wheel_segments;
DROP POLICY IF EXISTS "Admin gerencia segmentos roleta" ON public.prize_wheel_segments;
DROP POLICY IF EXISTS "Usuario ve proprios giros roleta" ON public.prize_wheel_spins;
DROP POLICY IF EXISTS "Admin ve todos giros roleta" ON public.prize_wheel_spins;

CREATE POLICY "Publico ve config roleta ativa"
  ON public.prize_wheel_config FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia config roleta"
  ON public.prize_wheel_config FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Publico ve segmentos roleta ativos"
  ON public.prize_wheel_segments FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia segmentos roleta"
  ON public.prize_wheel_segments FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Usuario ve proprios giros roleta"
  ON public.prize_wheel_spins FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Admin ve todos giros roleta"
  ON public.prize_wheel_spins FOR SELECT
  USING (public.is_user_admin());

GRANT SELECT ON public.prize_wheel_config TO anon, authenticated;
GRANT SELECT ON public.prize_wheel_segments TO anon, authenticated;
GRANT SELECT ON public.prize_wheel_spins TO authenticated;

-- ============================================================
-- SEED INICIAL
-- ============================================================

INSERT INTO public.prize_wheel_config (
  id,
  ativo,
  titulo_imagem_url,
  banner_imagem_url,
  roleta_imagem_url,
  widget_imagem_url,
  centro_imagem_url,
  giros_por_periodo,
  cooldown_horas
)
VALUES (
  1,
  true,
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69b332751671a_Camada%200.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b9cff_SEU%20PR%C3%8AMIO%20URANO.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5add7dcc9_URANO%20ROLETA.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b95b9_ChatGPTImage8_03_202617_52_42.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b95b9_ChatGPTImage8_03_202617_52_42.png',
  1,
  24
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.prize_wheel_config IS 'Configuração global da roleta de prêmios';
COMMENT ON TABLE public.prize_wheel_segments IS 'Segmentos da roleta vinculados a cupons de rodadas';
COMMENT ON TABLE public.prize_wheel_spins IS 'Histórico de giros na roleta por usuário';
