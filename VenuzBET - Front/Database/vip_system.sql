-- =============================================================================
-- VenuzBET — Sistema VIP por depósitos
-- Execute no SQL Editor do Supabase (após master_setup.sql).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Colunas em usuarios
-- -----------------------------------------------------------------------------
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS vip_nivel INT NOT NULL DEFAULT 1;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS total_depositado DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS vip_atualizado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.usuarios.vip_nivel IS 'Nível VIP atual (1-18), baseado em total_depositado';
COMMENT ON COLUMN public.usuarios.total_depositado IS 'Soma de depósitos aprovados (lifetime)';

-- -----------------------------------------------------------------------------
-- 2. Tabela vip_niveis (configuração)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vip_niveis (
  nivel INT PRIMARY KEY CHECK (nivel >= 1 AND nivel <= 99),
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL,
  subnivel INT NOT NULL DEFAULT 1,
  deposito_minimo DECIMAL(12,2) NOT NULL DEFAULT 0,
  cashback_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  bonus_upgrade DECIMAL(10,2) NOT NULL DEFAULT 0,
  imagem_url TEXT,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- -----------------------------------------------------------------------------
-- 3. Tabela vip_historico
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vip_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nivel_anterior INT NOT NULL,
  nivel_novo INT NOT NULL,
  deposito_id UUID REFERENCES public.depositos(id) ON DELETE SET NULL,
  total_depositado DECIMAL(12,2) NOT NULL,
  bonus_creditado DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_vip_historico_usuario ON public.vip_historico(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vip_historico_created ON public.vip_historico(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Seed dos 18 níveis VIP
-- -----------------------------------------------------------------------------
INSERT INTO public.vip_niveis (nivel, nome, grupo, subnivel, deposito_minimo, cashback_pct, bonus_upgrade, imagem_url, cor)
VALUES
  (1,  'Bronze 1',     'bronze',    1, 0,       0.00, 0,    'https://cdn.royalbetsolutions.com/default/vip/bronze.webp',    'rgb(255, 146, 17)'),
  (2,  'Bronze 2',     'bronze',    2, 100,     0.00, 0,    'https://cdn.royalbetsolutions.com/default/vip/bronze.webp',    'rgb(255, 146, 17)'),
  (3,  'Bronze 3',     'bronze',    3, 300,     0.00, 0,    'https://cdn.royalbetsolutions.com/default/vip/bronze.webp',    'rgb(255, 146, 17)'),
  (4,  'Prata 1',      'prata',     1, 600,     0.30, 5,    'https://cdn.royalbetsolutions.com/default/vip/prata.webp',     'rgb(192, 192, 192)'),
  (5,  'Prata 2',      'prata',     2, 1000,    0.40, 10,   'https://cdn.royalbetsolutions.com/default/vip/prata.webp',     'rgb(192, 192, 192)'),
  (6,  'Prata 3',      'prata',     3, 2000,    0.50, 15,   'https://cdn.royalbetsolutions.com/default/vip/prata.webp',     'rgb(192, 192, 192)'),
  (7,  'Ouro 1',       'ouro',      1, 5000,    0.80, 25,   'https://cdn.royalbetsolutions.com/default/vip/ouro.webp',      'rgb(255, 192, 0)'),
  (8,  'Ouro 2',       'ouro',      2, 10000,   1.00, 50,   'https://cdn.royalbetsolutions.com/default/vip/ouro.webp',      'rgb(255, 192, 0)'),
  (9,  'Ouro 3',       'ouro',      3, 20000,   1.20, 100,  'https://cdn.royalbetsolutions.com/default/vip/ouro.webp',      'rgb(255, 192, 0)'),
  (10, 'Rubi 1',       'rubi',      1, 35000,   1.50, 150,  'https://cdn.royalbetsolutions.com/default/vip/rubi.webp',      'rgb(255, 60, 55)'),
  (11, 'Rubi 2',       'rubi',      2, 50000,   1.80, 250,  'https://cdn.royalbetsolutions.com/default/vip/rubi.webp',      'rgb(255, 60, 55)'),
  (12, 'Rubi 3',       'rubi',      3, 75000,   2.00, 500,  'https://cdn.royalbetsolutions.com/default/vip/rubi.webp',      'rgb(255, 60, 55)'),
  (13, 'Esmeralda 1',  'esmeralda', 1, 100000,  2.50, 750,  'https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp', 'rgb(2, 210, 106)'),
  (14, 'Esmeralda 2',  'esmeralda', 2, 150000,  3.00, 1000, 'https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp', 'rgb(2, 210, 106)'),
  (15, 'Esmeralda 3',  'esmeralda', 3, 250000,  3.50, 2000, 'https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp', 'rgb(2, 210, 106)'),
  (16, 'Diamante 1',   'diamante',  1, 400000,  5.00, 3000, 'https://cdn.royalbetsolutions.com/default/vip/diamante.webp',  'rgb(11, 167, 254)'),
  (17, 'Diamante 2',   'diamante',  2, 600000,  6.50, 5000, 'https://cdn.royalbetsolutions.com/default/vip/diamante.webp',  'rgb(11, 167, 254)'),
  (18, 'Diamante 3',   'diamante',  3, 1000000, 8.00, 10000,'https://cdn.royalbetsolutions.com/default/vip/diamante.webp',  'rgb(11, 167, 254)')
ON CONFLICT (nivel) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Funções auxiliares
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_vip_nivel(p_total_depositado numeric)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(nivel), 1)::int
  FROM public.vip_niveis
  WHERE deposito_minimo <= COALESCE(p_total_depositado, 0);
$$;

CREATE OR REPLACE FUNCTION public.processar_vip_deposito(
  p_usuario_id uuid,
  p_deposito_id uuid,
  p_valor numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nivel_anterior int;
  v_nivel_novo int;
  v_total numeric;
  v_bonus numeric := 0;
  v_subiu boolean := false;
  v_nivel_info record;
  v_proximo record;
BEGIN
  SELECT vip_nivel, total_depositado
  INTO v_nivel_anterior, v_total
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  v_total := COALESCE(v_total, 0) + p_valor;
  v_nivel_novo := public.calcular_vip_nivel(v_total);

  IF v_nivel_novo > COALESCE(v_nivel_anterior, 1) THEN
    v_subiu := true;
    SELECT bonus_upgrade INTO v_bonus
    FROM public.vip_niveis
    WHERE nivel = v_nivel_novo;

    v_bonus := COALESCE(v_bonus, 0);

    INSERT INTO public.vip_historico (
      usuario_id, nivel_anterior, nivel_novo, deposito_id, total_depositado, bonus_creditado
    ) VALUES (
      p_usuario_id, COALESCE(v_nivel_anterior, 1), v_nivel_novo, p_deposito_id, v_total, v_bonus
    );

    UPDATE public.usuarios
    SET
      total_depositado = v_total,
      vip_nivel = v_nivel_novo,
      vip_atualizado_em = NOW(),
      saldo = saldo + v_bonus
    WHERE id = p_usuario_id;
  ELSE
    UPDATE public.usuarios
    SET
      total_depositado = v_total,
      vip_nivel = v_nivel_novo,
      vip_atualizado_em = NOW()
    WHERE id = p_usuario_id;
  END IF;

  SELECT nivel, nome, grupo, deposito_minimo, cashback_pct, bonus_upgrade, imagem_url, cor
  INTO v_nivel_info
  FROM public.vip_niveis
  WHERE nivel = v_nivel_novo;

  SELECT nivel, nome, deposito_minimo
  INTO v_proximo
  FROM public.vip_niveis
  WHERE nivel = v_nivel_novo + 1;

  RETURN json_build_object(
    'vip_nivel', v_nivel_novo,
    'vip_nome', v_nivel_info.nome,
    'vip_grupo', v_nivel_info.grupo,
    'vip_imagem', v_nivel_info.imagem_url,
    'vip_cor', v_nivel_info.cor,
    'cashback_pct', v_nivel_info.cashback_pct,
    'total_depositado', v_total,
    'subiu_nivel', v_subiu,
    'nivel_anterior', COALESCE(v_nivel_anterior, 1),
    'bonus_upgrade', CASE WHEN v_subiu THEN v_bonus ELSE 0 END,
    'proximo_nivel', v_proximo.nivel,
    'proximo_nome', v_proximo.nome,
    'proximo_deposito_minimo', v_proximo.deposito_minimo,
    'falta_para_proximo', CASE
      WHEN v_proximo.nivel IS NULL THEN 0
      ELSE GREATEST(v_proximo.deposito_minimo - v_total, 0)
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_vip_usuario()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_nivel int;
  v_total numeric;
  v_nivel_info record;
  v_proximo record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT vip_nivel, total_depositado
  INTO v_nivel, v_total
  FROM public.usuarios
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  v_nivel := COALESCE(v_nivel, 1);
  v_total := COALESCE(v_total, 0);

  SELECT nivel, nome, grupo, deposito_minimo, cashback_pct, bonus_upgrade, imagem_url, cor
  INTO v_nivel_info
  FROM public.vip_niveis
  WHERE nivel = v_nivel;

  SELECT nivel, nome, deposito_minimo
  INTO v_proximo
  FROM public.vip_niveis
  WHERE nivel = v_nivel + 1;

  RETURN json_build_object(
    'ok', true,
    'vip_nivel', v_nivel,
    'vip_nome', v_nivel_info.nome,
    'vip_grupo', v_nivel_info.grupo,
    'vip_imagem', v_nivel_info.imagem_url,
    'vip_cor', v_nivel_info.cor,
    'cashback_pct', COALESCE(v_nivel_info.cashback_pct, 0),
    'total_depositado', v_total,
    'deposito_minimo_atual', COALESCE(v_nivel_info.deposito_minimo, 0),
    'proximo_nivel', v_proximo.nivel,
    'proximo_nome', v_proximo.nome,
    'proximo_deposito_minimo', v_proximo.deposito_minimo,
    'falta_para_proximo', CASE
      WHEN v_proximo.nivel IS NULL THEN 0
      ELSE GREATEST(v_proximo.deposito_minimo - v_total, 0)
    END,
    'progresso_pct', CASE
      WHEN v_proximo.nivel IS NULL THEN 100
      WHEN v_proximo.deposito_minimo <= COALESCE(v_nivel_info.deposito_minimo, 0) THEN 100
      ELSE LEAST(100, GREATEST(0,
        ((v_total - COALESCE(v_nivel_info.deposito_minimo, 0)) /
         NULLIF(v_proximo.deposito_minimo - COALESCE(v_nivel_info.deposito_minimo, 0), 0)) * 100
      ))
    END
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Atualizar confirmar_deposito_pix_pago
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_valor numeric;
  v_status text;
  v_usuario_id uuid;
  v_vip json;
  v_nivel int;
  v_total numeric;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT usuario_id, valor, status INTO v_usuario_id, v_valor, v_status
  FROM public.depositos
  WHERE id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id != v_uid THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_status = 'aprovado' THEN
    SELECT vip_nivel, total_depositado INTO v_nivel, v_total
    FROM public.usuarios WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'already', true,
      'vip_nivel', COALESCE(v_nivel, 1),
      'total_depositado', COALESCE(v_total, 0),
      'subiu_nivel', false,
      'bonus_upgrade', 0
    );
  END IF;

  IF v_status != 'pendente' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  UPDATE public.depositos
  SET status = 'aprovado'
  WHERE id = p_deposito_id;

  UPDATE public.usuarios
  SET saldo = saldo + v_valor
  WHERE id = v_usuario_id;

  v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);

  RETURN (json_build_object('ok', true, 'already', false)::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. Backfill para usuários com depósitos existentes
-- -----------------------------------------------------------------------------
UPDATE public.usuarios u
SET
  total_depositado = COALESCE(d.total, 0),
  vip_nivel = public.calcular_vip_nivel(COALESCE(d.total, 0)),
  vip_atualizado_em = NOW()
FROM (
  SELECT usuario_id, SUM(valor) AS total
  FROM public.depositos
  WHERE status = 'aprovado'
  GROUP BY usuario_id
) d
WHERE u.id = d.usuario_id;

-- -----------------------------------------------------------------------------
-- 8. RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.vip_niveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver níveis VIP" ON public.vip_niveis;
DROP POLICY IF EXISTS "Admin pode gerenciar níveis VIP" ON public.vip_niveis;

CREATE POLICY "Todos podem ver níveis VIP"
  ON public.vip_niveis FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar níveis VIP"
  ON public.vip_niveis FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "Usuários veem próprio histórico VIP" ON public.vip_historico;
DROP POLICY IF EXISTS "Admin vê todo histórico VIP" ON public.vip_historico;

CREATE POLICY "Usuários veem próprio histórico VIP"
  ON public.vip_historico FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Admin vê todo histórico VIP"
  ON public.vip_historico FOR SELECT USING (public.is_user_admin());

-- -----------------------------------------------------------------------------
-- 9. Grants
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.vip_niveis TO anon, authenticated;
GRANT SELECT ON public.vip_historico TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_vip_nivel(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_vip_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(uuid) TO authenticated;

COMMENT ON TABLE public.vip_niveis IS 'Configuração dos níveis VIP por depósito acumulado';
COMMENT ON TABLE public.vip_historico IS 'Histórico de upgrades VIP dos usuários';
COMMENT ON FUNCTION public.obter_vip_usuario() IS 'Retorna nível VIP, progresso e benefícios do usuário autenticado';
