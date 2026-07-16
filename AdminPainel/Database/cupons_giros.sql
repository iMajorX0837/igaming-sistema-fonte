-- Extensão do sistema de cupons para rodadas grátis em jogos específicos
-- Execute após cupons.sql no SQL Editor do Supabase

-- ============================================================
-- EXTENSÃO DA TABELA CUPONS
-- ============================================================

ALTER TABLE public.cupons DROP CONSTRAINT IF EXISTS cupons_tipo_bonus_check;

ALTER TABLE public.cupons
  ADD CONSTRAINT cupons_tipo_bonus_check
  CHECK (tipo_bonus IN ('saldo_real', 'giros_gratis'));

ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS jogo_slug TEXT;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS jogo_nome TEXT;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS provider_slug TEXT DEFAULT 'pragmatic';

ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS quantidade_giros INT;
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS jogo_slug TEXT;
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS jogo_nome TEXT;
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS status_giro TEXT;

ALTER TABLE public.cupom_usos DROP CONSTRAINT IF EXISTS cupom_usos_origem_check;
ALTER TABLE public.cupom_usos
  ADD CONSTRAINT cupom_usos_origem_check
  CHECK (origem IN ('manual', 'deposito', 'roleta'));

ALTER TABLE public.cupom_usos DROP CONSTRAINT IF EXISTS cupom_usos_status_giro_check;
ALTER TABLE public.cupom_usos
  ADD CONSTRAINT cupom_usos_status_giro_check
  CHECK (status_giro IS NULL OR status_giro IN ('pendente_deposito', 'disponivel', 'usado'));

COMMENT ON COLUMN public.cupons.jogo_slug IS 'Slug do jogo (apenas cupons giros_gratis)';
COMMENT ON COLUMN public.cupons.jogo_nome IS 'Nome exibido do jogo (apenas cupons giros_gratis)';
COMMENT ON COLUMN public.cupons.provider_slug IS 'Slug do provedor, ex: pragmatic';
COMMENT ON COLUMN public.cupom_usos.quantidade_giros IS 'Quantidade de rodadas grátis concedidas';
COMMENT ON COLUMN public.cupom_usos.status_giro IS 'Status das rodadas: pendente_deposito, disponivel, usado';
