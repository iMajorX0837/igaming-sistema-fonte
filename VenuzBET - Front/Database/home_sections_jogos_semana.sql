-- Adiciona a seção "+ Jogados da Semana" na home
-- Execute no SQL Editor do Supabase (bancos já existentes)
--
-- IMPORTANTE: se der deadlock (40P01), NÃO rode este script completo.
-- Use Database/home_sections_fix_links.sql (só UPDATEs) ou aguarde ~30s e tente de novo
-- com uma única aba aberta no SQL Editor (sem o site aberto em outra aba).

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'home_sections'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.home_sections DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.home_sections
  ADD CONSTRAINT home_sections_tipo_check
  CHECK (tipo IN ('estudios', 'recomendados', 'jogos_semana', 'jogos_pg', 'jogos_mesa', 'jogos_turbo'));

INSERT INTO public.home_sections (id, slug, titulo, tipo, ordem, ativo, view_all_link, use_green_button)
VALUES
  ('e1111111-1111-1111-1111-111111111106', 'jogos-semana', '+ Jogados da Semana', 'jogos_semana', 2, true, '/games', false)
ON CONFLICT (slug) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  tipo = EXCLUDED.tipo,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  view_all_link = EXCLUDED.view_all_link,
  use_green_button = EXCLUDED.use_green_button,
  updated_at = TIMEZONE('utc'::text, NOW());

UPDATE public.home_sections SET ordem = 3, updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'jogos-pg';
UPDATE public.home_sections SET ordem = 4, updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'jogos-mesa';
UPDATE public.home_sections SET view_all_link = '/provider/pragmatic', updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'jogos-turbo';
UPDATE public.home_sections SET ordem = 6, updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'estudios';
