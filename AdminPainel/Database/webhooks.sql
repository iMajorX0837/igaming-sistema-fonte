-- Sistema de Webhooks (callbacks para eventos externos — Meta Ads, n8n, etc.)
-- Execute no SQL Editor do Supabase

-- =============================================================================
-- 1. Tracking em usuarios (UTM / Meta)
-- =============================================================================

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS fbp TEXT;

-- =============================================================================
-- 2. Tabelas de webhooks
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  evento TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhooks_evento_check CHECK (
    evento IN ('user.register', 'deposit.paid', 'deposit.created', 'withdraw.approved')
  )
);

CREATE INDEX IF NOT EXISTS idx_webhooks_evento_ativo ON public.webhooks (evento, ativo);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INT,
  response_body TEXT,
  tentativas INT NOT NULL DEFAULT 0,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  CONSTRAINT webhook_deliveries_status_check CHECK (
    status IN ('pending', 'success', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries (status, created_at DESC);

-- =============================================================================
-- 3. RLS
-- =============================================================================

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhooks_admin_all ON public.webhooks;
CREATE POLICY webhooks_admin_all ON public.webhooks
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS webhook_deliveries_admin_select ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_admin_select ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.is_user_admin());

-- =============================================================================
-- 4. Trigger updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS set_updated_at_webhooks ON public.webhooks;
CREATE TRIGGER set_updated_at_webhooks
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. handle_new_user — salvar tracking do metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_code TEXT;
  referred_by_code TEXT;
  user_name TEXT;
  full_name TEXT;
BEGIN
  referral_code := public.generate_referral_code();
  referred_by_code := COALESCE(NEW.raw_user_meta_data->>'referral_code', NULL);

  IF referred_by_code IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE link_indicação = referred_by_code) THEN
      referred_by_code := NULL;
    END IF;
  END IF;

  user_name := COALESCE(NEW.raw_user_meta_data->>'usuario', NULL);

  IF user_name IS NULL AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    user_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;

  full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'usuario_nome', '')), '');

  INSERT INTO public.usuarios (
    id,
    nome,
    usuario,
    usuario_nome,
    cpf,
    email,
    telefone,
    link_indicação,
    indicado_por,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    fbc,
    fbp
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NULL),
    user_name,
    full_name,
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    referral_code,
    referred_by_code,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_source', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_medium', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_campaign', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_content', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_term', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'fbclid', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'fbc', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'fbp', '')), '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.webhooks IS 'Webhooks configuráveis pelo admin para eventos do sistema';
COMMENT ON TABLE public.webhook_deliveries IS 'Log de entregas de webhooks (debug e auditoria)';
