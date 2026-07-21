export type PaymentGatewayId = 'misticpay' | 'bspay' | 'veopag';

export interface PaymentGatewayResponse {
  ok: boolean;
  error?: string;
  payment_gateway?: PaymentGatewayId;
  misticpay_configured?: boolean;
  bspay_configured?: boolean;
  veopag_configured?: boolean;
}

export interface MisticPayConfigResponse {
  ok: boolean;
  error?: string;
  misticpay_ci?: string;
  misticpay_api_url?: string;
  misticpay_cs_configured?: boolean;
  misticpay_webhook_secret_configured?: boolean;
  updated_at?: string;
}

export interface BspayConfigResponse {
  ok: boolean;
  error?: string;
  bspay_client_id?: string;
  bspay_api_url?: string;
  bspay_client_secret_configured?: boolean;
  bspay_signing_key_configured?: boolean;
  bspay_webhook_secret_configured?: boolean;
  updated_at?: string;
}

export interface VeopagConfigResponse {
  ok: boolean;
  error?: string;
  veopag_client_id?: string;
  veopag_api_url?: string;
  veopag_client_secret_configured?: boolean;
  veopag_webhook_secret_configured?: boolean;
  updated_at?: string;
}

export interface GatewayProviderMeta {
  id: PaymentGatewayId;
  label: string;
  description: string;
}
