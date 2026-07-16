-- Adiciona URLs das imagens dos modais de login e cadastro em site_config
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS login_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS register_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';
