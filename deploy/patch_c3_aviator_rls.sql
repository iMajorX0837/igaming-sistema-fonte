-- =============================================================================
-- Patch C3 — Fecha RLS aberta do Aviator (USING true)
-- Execute no SQL Editor do Supabase.
--
-- service_role bypassa RLS no Supabase — nao precisa de policy "FOR ALL USING (true)".
-- Clientes (anon/authenticated) so podem SELECT (historico); writes so via API.
-- =============================================================================

-- aviator_rounds: remove write aberto
DROP POLICY IF EXISTS "Apenas service role pode criar/atualizar rodadas" ON public.aviator_rounds;
DROP POLICY IF EXISTS "Service role gerencia aviator_rounds" ON public.aviator_rounds;

-- Mantem SELECT publico (historico de rodadas)
DROP POLICY IF EXISTS "Todos podem ver rodadas do Aviator" ON public.aviator_rounds;
CREATE POLICY "Todos podem ver rodadas do Aviator"
  ON public.aviator_rounds
  FOR SELECT
  USING (true);

-- aviator_bets: remove FOR ALL aberto + INSERT de usuario (fabricar cashout)
DROP POLICY IF EXISTS "Service role pode gerenciar todas as apostas" ON public.aviator_bets;
DROP POLICY IF EXISTS "Usuarios podem criar suas proprias apostas" ON public.aviator_bets;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias apostas" ON public.aviator_bets;

DROP POLICY IF EXISTS "Usuarios podem ver apenas suas proprias apostas" ON public.aviator_bets;
DROP POLICY IF EXISTS "Usuários podem ver apenas suas próprias apostas" ON public.aviator_bets;
CREATE POLICY "Usuarios podem ver apenas suas proprias apostas"
  ON public.aviator_bets
  FOR SELECT
  USING (auth.uid() = usuario_id OR public.is_user_admin());

-- aviator_velas: remove INSERT aberto
DROP POLICY IF EXISTS "Service role pode inserir velas" ON public.aviator_velas;
DROP POLICY IF EXISTS "Service role gerencia aviator_velas" ON public.aviator_velas;

DROP POLICY IF EXISTS "Todos podem ver velas do Aviator" ON public.aviator_velas;
CREATE POLICY "Todos podem ver velas do Aviator"
  ON public.aviator_velas
  FOR SELECT
  USING (true);

-- Garante RLS ligado
ALTER TABLE public.aviator_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_velas ENABLE ROW LEVEL SECURITY;
