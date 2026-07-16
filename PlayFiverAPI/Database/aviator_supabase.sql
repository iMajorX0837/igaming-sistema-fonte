-- Migração: Aviator próprio — campos extras para sincronizar com o motor Python
-- Execute no SQL Editor do Supabase

ALTER TABLE public.aviator_rounds
  ADD COLUMN IF NOT EXISTS external_round_id BIGINT,
  ADD COLUMN IF NOT EXISTS server_seed TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS aviator_rounds_external_round_id_idx
  ON public.aviator_rounds(external_round_id)
  WHERE external_round_id IS NOT NULL;

ALTER TABLE public.aviator_bets
  ADD COLUMN IF NOT EXISTS bet_slot SMALLINT NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS aviator_bets_round_user_slot_idx
  ON public.aviator_bets(round_id, usuario_id, bet_slot);

ALTER TABLE public.aviator_velas
  ADD COLUMN IF NOT EXISTS external_round_id BIGINT;

CREATE INDEX IF NOT EXISTS aviator_velas_external_round_id_idx
  ON public.aviator_velas(external_round_id)
  WHERE external_round_id IS NOT NULL;

COMMENT ON COLUMN public.aviator_rounds.external_round_id IS 'ID da rodada no motor Python (ex.: 8273700)';
COMMENT ON COLUMN public.aviator_rounds.server_seed IS 'Seed do servidor para fairness';
COMMENT ON COLUMN public.aviator_bets.bet_slot IS 'Slot da aposta no cliente (1 ou 2)';
COMMENT ON COLUMN public.aviator_velas.external_round_id IS 'ID da rodada no motor Python';

-- Histórico: no máximo 27 velas no Supabase (remove as mais antigas após cada insert).
-- O motor Python não usa mais SQLite local (historico.db).

CREATE OR REPLACE FUNCTION public.trim_aviator_velas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_round_ids UUID[];
  excess INTEGER;
BEGIN
  SELECT GREATEST(0, COUNT(*) - 27) INTO excess FROM public.aviator_velas;
  IF excess <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT ARRAY_AGG(DISTINCT round_id) FILTER (WHERE round_id IS NOT NULL)
  INTO removed_round_ids
  FROM (
    SELECT round_id
    FROM public.aviator_velas
    ORDER BY created_at ASC, id ASC
    LIMIT excess
  ) old_velas;

  DELETE FROM public.aviator_velas
  WHERE id IN (
    SELECT id
    FROM public.aviator_velas
    ORDER BY created_at ASC, id ASC
    LIMIT excess
  );

  IF removed_round_ids IS NOT NULL AND array_length(removed_round_ids, 1) > 0 THEN
    DELETE FROM public.aviator_bets WHERE round_id = ANY(removed_round_ids);
    DELETE FROM public.aviator_rounds WHERE id = ANY(removed_round_ids);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trim_aviator_velas_after_insert ON public.aviator_velas;
CREATE TRIGGER trim_aviator_velas_after_insert
  AFTER INSERT ON public.aviator_velas
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_aviator_velas();
