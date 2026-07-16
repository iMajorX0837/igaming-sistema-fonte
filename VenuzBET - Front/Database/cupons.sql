-- Sistema de cupons configurável pelo administrador
-- Execute no SQL Editor do Supabase

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_admin TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  tipo_valor TEXT NOT NULL CHECK (tipo_valor IN ('porcentagem', 'fixo')),
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  tipo_bonus TEXT NOT NULL DEFAULT 'saldo_real' CHECK (tipo_bonus IN ('saldo_real', 'giros_gratis')),
  deposito_minimo DECIMAL(10,2),
  bonus_maximo DECIMAL(10,2),
  limite_uso_total INT,
  limite_uso_por_usuario INT NOT NULL DEFAULT 1,
  usos_total INT NOT NULL DEFAULT 0,
  jogo_slug TEXT,
  jogo_nome TEXT,
  provider_slug TEXT DEFAULT 'pragmatic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT cupons_codigo_unique UNIQUE (codigo),
  CONSTRAINT cupons_deposito_minimo_nonneg CHECK (deposito_minimo IS NULL OR deposito_minimo >= 0),
  CONSTRAINT cupons_bonus_maximo_nonneg CHECK (bonus_maximo IS NULL OR bonus_maximo > 0),
  CONSTRAINT cupons_limite_uso_total_pos CHECK (limite_uso_total IS NULL OR limite_uso_total > 0),
  CONSTRAINT cupons_limite_uso_por_usuario_pos CHECK (limite_uso_por_usuario > 0)
);

CREATE INDEX IF NOT EXISTS idx_cupons_codigo ON public.cupons(UPPER(codigo));
CREATE INDEX IF NOT EXISTS idx_cupons_ativo ON public.cupons(ativo) WHERE ativo = true;

CREATE TABLE IF NOT EXISTS public.cupom_usos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id UUID NOT NULL REFERENCES public.cupons(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  deposito_id UUID REFERENCES public.depositos(id) ON DELETE SET NULL,
  valor_bonus DECIMAL(10,2) NOT NULL,
  valor_deposito DECIMAL(10,2),
  quantidade_giros INT,
  jogo_slug TEXT,
  jogo_nome TEXT,
  origem TEXT NOT NULL DEFAULT 'manual',
  status_giro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_cupom_usos_cupom ON public.cupom_usos(cupom_id);
CREATE INDEX IF NOT EXISTS idx_cupom_usos_usuario ON public.cupom_usos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cupom_usos_deposito ON public.cupom_usos(deposito_id);

-- Coluna opcional no depósito para vincular cupom aplicado no checkout
ALTER TABLE public.depositos ADD COLUMN IF NOT EXISTS cupom_codigo TEXT;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupom_usos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode gerenciar cupons" ON public.cupons;
DROP POLICY IF EXISTS "Usuario ve proprios usos de cupom" ON public.cupom_usos;
DROP POLICY IF EXISTS "Admin pode ver todos usos de cupom" ON public.cupom_usos;

CREATE POLICY "Admin pode gerenciar cupons"
  ON public.cupons FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Usuario ve proprios usos de cupom"
  ON public.cupom_usos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Admin pode ver todos usos de cupom"
  ON public.cupom_usos FOR SELECT
  USING (public.is_user_admin());

GRANT SELECT ON public.cupom_usos TO authenticated;

COMMENT ON TABLE public.cupons IS 'Cupons promocionais configuráveis pelo administrador';
COMMENT ON TABLE public.cupom_usos IS 'Histórico de ativações de cupons por usuário';
