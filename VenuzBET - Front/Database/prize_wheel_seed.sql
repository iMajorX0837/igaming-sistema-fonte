-- Seed de cupons + segmentos da roleta de prêmios
-- Execute após: cupons.sql → cupons_giros.sql → prize_wheel.sql → cupons_rpc_giros.sql → prize_wheel_rpc.sql

INSERT INTO public.cupons (
  nome_admin,
  codigo,
  tipo_valor,
  valor,
  tipo_bonus,
  jogo_slug,
  jogo_nome,
  provider_slug,
  limite_uso_por_usuario
)
VALUES
  ('Roleta - Gates of Olympus', 'ROLETA-GOO', 'fixo', 85, 'giros_gratis', 'gates-of-olympus', 'Gates of Olympus', 'pragmatic', 999),
  ('Roleta - Starlight Princess', 'ROLETA-SP', 'fixo', 70, 'giros_gratis', 'starlight-princess', 'Starlight Princess', 'pragmatic', 999),
  ('Roleta - Sweet Bonanza', 'ROLETA-SB', 'fixo', 95, 'giros_gratis', 'sweet-bonanza', 'Sweet Bonanza', 'pragmatic', 999),
  ('Roleta - Sugar Rush', 'ROLETA-SR', 'fixo', 65, 'giros_gratis', 'sugar-rush', 'Sugar Rush', 'pragmatic', 999),
  ('Roleta - Starlight 1000', 'ROLETA-SP1K', 'fixo', 55, 'giros_gratis', 'starlight-princess-1000', 'Starlight Princess 1000', 'pragmatic', 999),
  ('Roleta - Gates 1000', 'ROLETA-GOO1K', 'fixo', 95, 'giros_gratis', 'gates-of-olympus-1000', 'Gates of Olympus 1000', 'pragmatic', 999),
  ('Roleta - Sweet 1000', 'ROLETA-SB1K', 'fixo', 100, 'giros_gratis', 'sweet-bonanza-1000', 'Sweet Bonanza 1000', 'pragmatic', 999),
  ('Roleta - Caramelo', 'ROLETA-CAR', 'fixo', 65, 'giros_gratis', 'o-vira-lata-caramelo', 'O Vira Lata Caramelo', 'pragmatic', 999)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Gates of Olympus', '85 Giros', c.id, 12, 1, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-GOO'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Starlight Princess', '70 Giros', c.id, 12, 2, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-SP'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Sweet Bonanza', '95 Giros', c.id, 12, 3, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-SB'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Sugar Rush', '65 Giros', c.id, 12, 4, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-SR'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Starlight 1000', '55 Giros', c.id, 10, 5, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-SP1K'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Gates 1000', '95 Giros', c.id, 10, 6, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-GOO1K'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Sweet 1000', '100 Giros', c.id, 10, 7, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-SB1K'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

INSERT INTO public.prize_wheel_segments (nome_admin, label, cupom_id, peso, ordem, ativo)
SELECT 'Segmento Caramelo', '65 Giros', c.id, 10, 8, true
FROM public.cupons c
WHERE c.codigo = 'ROLETA-CAR'
  AND NOT EXISTS (
    SELECT 1 FROM public.prize_wheel_segments s WHERE s.cupom_id = c.id
  );

-- Garante que a roleta está ativa
UPDATE public.prize_wheel_config
SET ativo = true
WHERE id = 1;
