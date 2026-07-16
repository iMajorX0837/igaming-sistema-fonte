-- Correção rápida de links "Ver Tudo" (sem ALTER TABLE — evita deadlock)
-- Rode sozinho no SQL Editor. Feche abas duplicadas do editor antes de executar.

UPDATE public.home_sections
SET view_all_link = '/provider/pgsoft', updated_at = NOW()
WHERE slug IN ('jogos-pg', 'jogos-mesa');

UPDATE public.home_sections
SET view_all_link = '/provider/pragmatic', updated_at = NOW()
WHERE slug = 'jogos-turbo';
