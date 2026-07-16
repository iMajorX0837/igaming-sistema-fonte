-- Função para contar indicações qualificadas de um usuário
-- Uma indicação é qualificada quando o usuário indicado fez um depósito mínimo de R$ 50,00 aprovado
CREATE OR REPLACE FUNCTION public.count_qualified_referrals(referral_code_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  qualified_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT u.id) INTO qualified_count
  FROM public.usuarios u
  INNER JOIN public.depositos d ON d.usuario_id = u.id
  WHERE u.indicado_por = referral_code_param
    AND d.status = 'aprovado'
    AND d.valor >= 50.00;
  
  RETURN COALESCE(qualified_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

