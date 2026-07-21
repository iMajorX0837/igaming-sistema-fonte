-- Ativa OFICIAL - SPRIBE (PlayFivers id 83) e todos os jogos, exceto Aviator oficial (SPB_aviator).
-- Execute no SQL Editor do Supabase se quiser persistir no banco (opcional — o código já aplica os defaults).

INSERT INTO public.platform_providers (api_provider_id, slug, nome, ativo, api_status)
VALUES (83, 'oficial-spribe', 'OFICIAL - SPRIBE', true, 1)
ON CONFLICT (api_provider_id) DO UPDATE
SET slug = EXCLUDED.slug,
    nome = EXCLUDED.nome,
    ativo = true,
    api_status = EXCLUDED.api_status,
    updated_at = TIMEZONE('utc'::text, NOW());

INSERT INTO public.platform_games (api_provider_id, game_code, nome, ativo, api_status)
VALUES
  (83, 'SPB_goal', 'Goal', true, true),
  (83, 'SPB_dice', 'Dice', true, true),
  (83, 'SPB_plinko', 'Plinko', true, true),
  (83, 'SPB_mines', 'Mines', true, true),
  (83, 'SPB_hi-lo', 'Hilo', true, true),
  (83, 'SPB_keno', 'Keno', true, true),
  (83, 'SPB_mini-roulette', 'Mini Roulette', true, true),
  (83, 'SPB_hotline', 'Hotline', true, true),
  (83, 'SPB_multikeno', 'Keno 80', true, true),
  (83, 'SPB_balloon', 'Balloon', true, true),
  (83, 'SPB_trader', 'Trader', true, true),
  (83, 'SPB_pilot-chicken', 'Pilot Chicken', true, true),
  (83, 'SPB_aviator', 'Aviator', false, true)
ON CONFLICT (api_provider_id, game_code) DO UPDATE
SET nome = EXCLUDED.nome,
    ativo = EXCLUDED.ativo,
    api_status = EXCLUDED.api_status,
    updated_at = TIMEZONE('utc'::text, NOW());
