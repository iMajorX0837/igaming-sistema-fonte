-- Política RLS para permitir que admins vejam todas as transações de jogos
-- Execute este script no Supabase SQL Editor (requer is_user_admin() de create_admin_rls_policy.sql)

DROP POLICY IF EXISTS "Admins podem ver todas as transações de jogos" ON public.transacoes_jogos;

CREATE POLICY "Admins podem ver todas as transações de jogos"
  ON public.transacoes_jogos
  FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR
    public.is_user_admin()
  );

SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'transacoes_jogos'
ORDER BY policyname;
