import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
  DEFAULT_BSPAY_API_URL,
  DEFAULT_MISTICPAY_API_URL,
  DEFAULT_VEOPAG_API_URL,
} from './constants';
import type {
  BspayConfigResponse,
  MisticPayConfigResponse,
  PaymentGatewayId,
  PaymentGatewayResponse,
  VeopagConfigResponse,
} from './types';

export function usePaymentGatewayConfig() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [savingGateway, setSavingGateway] = useState(false);
  const [gateway, setGateway] = useState<PaymentGatewayId>('misticpay');
  const [activeGateway, setActiveGateway] = useState<PaymentGatewayId>('misticpay');
  const [misticpayConfigured, setMisticpayConfigured] = useState(false);
  const [bspayConfigured, setBspayConfigured] = useState(false);
  const [veopagConfigured, setVeopagConfigured] = useState(false);

  const [savingMisticpay, setSavingMisticpay] = useState(false);
  const [ci, setCi] = useState('');
  const [cs, setCs] = useState('');
  const [misticpayApiUrl, setMisticpayApiUrl] = useState(DEFAULT_MISTICPAY_API_URL);
  const [misticpayWebhookSecret, setMisticpayWebhookSecret] = useState('');
  const [csConfigured, setCsConfigured] = useState(false);
  const [misticpayWebhookConfigured, setMisticpayWebhookConfigured] = useState(false);
  const [misticpayUpdatedAt, setMisticpayUpdatedAt] = useState<string | null>(null);

  const [savingBspay, setSavingBspay] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [signingKey, setSigningKey] = useState('');
  const [bspayWebhookSecret, setBspayWebhookSecret] = useState('');
  const [bspayApiUrl, setBspayApiUrl] = useState(DEFAULT_BSPAY_API_URL);
  const [clientSecretConfigured, setClientSecretConfigured] = useState(false);
  const [signingKeyConfigured, setSigningKeyConfigured] = useState(false);
  const [bspayWebhookConfigured, setBspayWebhookConfigured] = useState(false);
  const [bspayUpdatedAt, setBspayUpdatedAt] = useState<string | null>(null);

  const [savingVeopag, setSavingVeopag] = useState(false);
  const [veopagClientId, setVeopagClientId] = useState('');
  const [veopagClientSecret, setVeopagClientSecret] = useState('');
  const [veopagWebhookSecret, setVeopagWebhookSecret] = useState('');
  const [veopagApiUrl, setVeopagApiUrl] = useState(DEFAULT_VEOPAG_API_URL);
  const [veopagClientSecretConfigured, setVeopagClientSecretConfigured] = useState(false);
  const [veopagWebhookConfigured, setVeopagWebhookConfigured] = useState(false);
  const [veopagUpdatedAt, setVeopagUpdatedAt] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);

      const [gatewayRes, misticpayRes, bspayRes, veopagRes] = await Promise.all([
        supabase.rpc('obter_payment_gateway_admin'),
        supabase.rpc('obter_misticpay_config_admin'),
        supabase.rpc('obter_bspay_config_admin'),
        supabase.rpc('obter_veopag_config_admin'),
      ]);

      if (gatewayRes.error) {
        showToast(
          'Erro ao carregar gateways. Execute patch_veopag_config.sql no Supabase.',
          'error',
        );
        return;
      }

      const gatewayData = gatewayRes.data as PaymentGatewayResponse;
      if (gatewayData?.ok) {
        const g = gatewayData.payment_gateway;
        const resolved = g === 'bspay' || g === 'veopag' ? g : 'misticpay';
        setGateway(resolved);
        setActiveGateway(resolved);
        setMisticpayConfigured(!!gatewayData.misticpay_configured);
        setBspayConfigured(!!gatewayData.bspay_configured);
        setVeopagConfigured(!!gatewayData.veopag_configured);
      }

      if (misticpayRes.error) {
        showToast(
          'Erro ao carregar MisticPay. Execute patch_misticpay_config.sql no Supabase.',
          'error',
        );
      } else {
        const misticpayData = misticpayRes.data as MisticPayConfigResponse;
        if (misticpayData?.ok) {
          setCi(misticpayData.misticpay_ci || '');
          setMisticpayApiUrl(misticpayData.misticpay_api_url || DEFAULT_MISTICPAY_API_URL);
          setCsConfigured(!!misticpayData.misticpay_cs_configured);
          setMisticpayWebhookConfigured(!!misticpayData.misticpay_webhook_secret_configured);
          setMisticpayUpdatedAt(misticpayData.updated_at || null);
          setCs('');
          setMisticpayWebhookSecret('');
        }
      }

      if (bspayRes.error) {
        showToast('Erro ao carregar BSPay.', 'error');
      } else {
        const bspayData = bspayRes.data as BspayConfigResponse;
        if (bspayData?.ok) {
          setClientId(bspayData.bspay_client_id || '');
          setBspayApiUrl(bspayData.bspay_api_url || DEFAULT_BSPAY_API_URL);
          setClientSecretConfigured(!!bspayData.bspay_client_secret_configured);
          setSigningKeyConfigured(!!bspayData.bspay_signing_key_configured);
          setBspayWebhookConfigured(!!bspayData.bspay_webhook_secret_configured);
          setBspayUpdatedAt(bspayData.updated_at || null);
          setClientSecret('');
          setSigningKey('');
          setBspayWebhookSecret('');
        }
      }

      if (veopagRes.error) {
        showToast('Erro ao carregar VeoPag.', 'error');
      } else {
        const veopagData = veopagRes.data as VeopagConfigResponse;
        if (veopagData?.ok) {
          setVeopagClientId(veopagData.veopag_client_id || '');
          setVeopagApiUrl(veopagData.veopag_api_url || DEFAULT_VEOPAG_API_URL);
          setVeopagClientSecretConfigured(!!veopagData.veopag_client_secret_configured);
          setVeopagWebhookConfigured(!!veopagData.veopag_webhook_secret_configured);
          setVeopagUpdatedAt(veopagData.updated_at || null);
          setVeopagClientSecret('');
          setVeopagWebhookSecret('');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSaveGateway = async () => {
    const configuredMap: Record<PaymentGatewayId, boolean> = {
      misticpay: misticpayConfigured,
      bspay: bspayConfigured,
      veopag: veopagConfigured,
    };

    const labelMap: Record<PaymentGatewayId, string> = {
      misticpay: 'MisticPay',
      bspay: 'BSPay',
      veopag: 'VeoPag',
    };

    if (!configuredMap[gateway]) {
      showToast(`Configure a ${labelMap[gateway]} antes de ativá-la.`, 'warning');
      return;
    }

    setSavingGateway(true);
    try {
      const { data, error } = await supabase.rpc('salvar_payment_gateway_admin', {
        p_payment_gateway: gateway,
      });

      if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
        return;
      }

      const result = data as PaymentGatewayResponse;
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar gateway.', 'error');
        return;
      }

      showToast('Gateway ativo atualizado!', 'success');
      setActiveGateway(gateway);
      await loadConfig();
    } finally {
      setSavingGateway(false);
    }
  };

  const handleSaveMisticpay = async () => {
    const trimmedCi = ci.trim();
    const trimmedApiUrl = misticpayApiUrl.trim() || DEFAULT_MISTICPAY_API_URL;

    if (!trimmedCi) {
      showToast('Informe o Client ID (CI) da MisticPay.', 'warning');
      return;
    }

    if (!csConfigured && !cs.trim()) {
      showToast('Informe o Client Secret (CS) da MisticPay.', 'warning');
      return;
    }

    setSavingMisticpay(true);
    try {
      const { data, error } = await supabase.rpc('salvar_misticpay_config_admin', {
        p_misticpay_ci: trimmedCi,
        p_misticpay_cs: cs.trim() || null,
        p_misticpay_api_url: trimmedApiUrl,
        p_misticpay_webhook_secret: misticpayWebhookSecret.trim() || null,
      });

      if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
        return;
      }

      const result = data as MisticPayConfigResponse;
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar MisticPay.', 'error');
        return;
      }

      showToast('Credenciais MisticPay salvas!', 'success');
      await loadConfig();
    } finally {
      setSavingMisticpay(false);
    }
  };

  const handleSaveBspay = async () => {
    const trimmedClientId = clientId.trim();
    const trimmedApiUrl = bspayApiUrl.trim() || DEFAULT_BSPAY_API_URL;

    if (!trimmedClientId) {
      showToast('Informe o Client ID da BSPay.', 'warning');
      return;
    }

    if (!clientSecretConfigured && !clientSecret.trim()) {
      showToast('Informe o Client Secret da BSPay.', 'warning');
      return;
    }

    if (!signingKeyConfigured && !signingKey.trim()) {
      showToast('Informe a Signing Key (HMAC) da BSPay.', 'warning');
      return;
    }

    setSavingBspay(true);
    try {
      const { data, error } = await supabase.rpc('salvar_bspay_config_admin', {
        p_bspay_client_id: trimmedClientId,
        p_bspay_client_secret: clientSecret.trim() || null,
        p_bspay_signing_key: signingKey.trim() || null,
        p_bspay_webhook_secret: bspayWebhookSecret.trim() || null,
        p_bspay_api_url: trimmedApiUrl,
      });

      if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
        return;
      }

      const result = data as BspayConfigResponse;
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar BSPay.', 'error');
        return;
      }

      showToast('Credenciais BSPay salvas!', 'success');
      await loadConfig();
    } finally {
      setSavingBspay(false);
    }
  };

  const handleSaveVeopag = async () => {
    const trimmedClientId = veopagClientId.trim();
    const trimmedApiUrl = veopagApiUrl.trim() || DEFAULT_VEOPAG_API_URL;

    if (!trimmedClientId) {
      showToast('Informe o Client ID da VeoPag.', 'warning');
      return;
    }

    if (!veopagClientSecretConfigured && !veopagClientSecret.trim()) {
      showToast('Informe o Client Secret da VeoPag.', 'warning');
      return;
    }

    setSavingVeopag(true);
    try {
      const { data, error } = await supabase.rpc('salvar_veopag_config_admin', {
        p_veopag_client_id: trimmedClientId,
        p_veopag_client_secret: veopagClientSecret.trim() || null,
        p_veopag_webhook_secret: veopagWebhookSecret.trim() || null,
        p_veopag_api_url: trimmedApiUrl,
      });

      if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
        return;
      }

      const result = data as VeopagConfigResponse;
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar VeoPag.', 'error');
        return;
      }

      showToast('Credenciais VeoPag salvas!', 'success');
      await loadConfig();
    } finally {
      setSavingVeopag(false);
    }
  };

  return {
    loading,
    gateway,
    activeGateway,
    setGateway,
    misticpayConfigured,
    bspayConfigured,
    veopagConfigured,
    savingGateway,
    handleSaveGateway,
    misticpay: {
      ci,
      setCi,
      cs,
      setCs,
      apiUrl: misticpayApiUrl,
      setApiUrl: setMisticpayApiUrl,
      webhookSecret: misticpayWebhookSecret,
      setWebhookSecret: setMisticpayWebhookSecret,
      csConfigured,
      webhookConfigured: misticpayWebhookConfigured,
      updatedAt: misticpayUpdatedAt,
      saving: savingMisticpay,
      handleSave: handleSaveMisticpay,
    },
    bspay: {
      clientId,
      setClientId,
      clientSecret,
      setClientSecret,
      signingKey,
      setSigningKey,
      webhookSecret: bspayWebhookSecret,
      setWebhookSecret: setBspayWebhookSecret,
      apiUrl: bspayApiUrl,
      setApiUrl: setBspayApiUrl,
      clientSecretConfigured,
      signingKeyConfigured,
      webhookConfigured: bspayWebhookConfigured,
      updatedAt: bspayUpdatedAt,
      saving: savingBspay,
      handleSave: handleSaveBspay,
    },
    veopag: {
      clientId: veopagClientId,
      setClientId: setVeopagClientId,
      clientSecret: veopagClientSecret,
      setClientSecret: setVeopagClientSecret,
      webhookSecret: veopagWebhookSecret,
      setWebhookSecret: setVeopagWebhookSecret,
      apiUrl: veopagApiUrl,
      setApiUrl: setVeopagApiUrl,
      clientSecretConfigured: veopagClientSecretConfigured,
      webhookConfigured: veopagWebhookConfigured,
      updatedAt: veopagUpdatedAt,
      saving: savingVeopag,
      handleSave: handleSaveVeopag,
    },
  };
}

export type PaymentGatewayConfig = ReturnType<typeof usePaymentGatewayConfig>;
