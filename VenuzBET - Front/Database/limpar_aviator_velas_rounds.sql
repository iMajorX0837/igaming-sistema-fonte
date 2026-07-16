-- Limpa histórico em public.aviator_velas e public.aviator_rounds.
-- Execute no SQL Editor do Supabase (ou psql).
--
-- Efeitos:
-- - TRUNCATE em aviator_velas remove todas as velas.
-- - DELETE em aviator_rounds remove todas as rodadas e, em cascata, as linhas em
--   public.aviator_bets que referenciam essas rodadas (ON DELETE CASCADE).
--
-- Opcional: descomente a linha ALTER SEQUENCE para reiniciar o contador round_number.

BEGIN;

TRUNCATE TABLE public.aviator_velas;

DELETE FROM public.aviator_rounds;

-- Opcional: reinicia o BIGSERIAL round_number da tabela aviator_rounds
-- ALTER SEQUENCE public.aviator_rounds_round_number_seq RESTART WITH 1;

COMMIT;
