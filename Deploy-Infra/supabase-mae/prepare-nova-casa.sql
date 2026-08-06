-- Limpa o schema public antes do import (projeto novo ou retry após falha parcial).
-- Não mexe em auth.*, storage.*, etc.

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

COMMENT ON SCHEMA public IS 'standard public schema';
