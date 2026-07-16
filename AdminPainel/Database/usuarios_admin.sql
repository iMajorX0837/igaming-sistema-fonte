-- 2FA (Google Authenticator) para administradores
-- Execute no SQL Editor do Supabase

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT;

COMMENT ON COLUMN public.usuarios.totp_secret IS 'Segredo TOTP base32 — somente servidor (2FA admin)';
COMMENT ON COLUMN public.usuarios.totp_pending_secret IS 'Segredo TOTP temporário durante configuração do 2FA';
COMMENT ON COLUMN public.usuarios.two_factor_enabled IS 'Indica se o 2FA (Google Authenticator) está ativo';

-- Segredos TOTP nunca devem ser expostos via RLS/RPC ao cliente.
-- Toda leitura/escrita passa pelo PlayFiverAPI com service role.
