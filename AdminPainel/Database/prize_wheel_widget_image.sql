-- Separa a imagem do widget flutuante da imagem do botão central (girar)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.prize_wheel_config
  ADD COLUMN IF NOT EXISTS widget_imagem_url TEXT;

-- Mantém o widget com a mesma imagem atual até o admin configurar outra
UPDATE public.prize_wheel_config
SET widget_imagem_url = centro_imagem_url
WHERE id = 1
  AND widget_imagem_url IS NULL
  AND centro_imagem_url IS NOT NULL;
