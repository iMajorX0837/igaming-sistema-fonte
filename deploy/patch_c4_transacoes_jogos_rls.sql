-- =============================================================================
-- Patch C4 — Fecha INSERT aberto em transacoes_jogos (anti fake rollover)
-- Execute no SQL Editor do Supabase.
--
-- Antes: policy "Permitir inserção via service role" com WITH CHECK (true)
--         permitia qualquer cliente autenticado inserir e abater rollover.
-- Depois: clientes so SELECT (proprio / admin); writes so service_role ou
--         SECURITY DEFINER (ex.: processar_callback_playfiver).
-- =============================================================================

-- Remove policy de INSERT aberta (nome enganoso)
DROP POLICY IF EXISTS "Permitir inserção de transações via service role" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Permitir insercao de transacoes via service role" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Service role pode inserir transacoes_jogos" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Usuarios podem inserir transacoes_jogos" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Usuários podem inserir transações de jogos" ON public.transacoes_jogos;

-- Garante RLS ligado
ALTER TABLE public.transacoes_jogos ENABLE ROW LEVEL SECURITY;

-- SELECT: dono ou admin (recria limpo)
DROP POLICY IF EXISTS "Usuários podem ver apenas suas próprias transações de jogos" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Usuarios podem ver apenas suas proprias transacoes de jogos" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Admins podem ver todas as transações de jogos" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Admins podem ver todas as transacoes de jogos" ON public.transacoes_jogos;

CREATE POLICY "Usuarios podem ver apenas suas proprias transacoes de jogos"
  ON public.transacoes_jogos
  FOR SELECT
  USING (auth.uid() = usuario_id OR public.is_user_admin());

-- Defense in depth: sem grant de escrita para clientes
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.transacoes_jogos FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.transacoes_jogos FROM anon, authenticated;

-- Leitura para autenticados (RLS filtra linhas)
GRANT SELECT ON public.transacoes_jogos TO authenticated;

-- service_role continua com bypass de RLS (API / Aviator wallet)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transacoes_jogos TO service_role;

COMMENT ON TABLE public.transacoes_jogos IS
  'Historico de apostas. INSERT/UPDATE so via service_role ou RPC SECURITY DEFINER (C4/C5).';
