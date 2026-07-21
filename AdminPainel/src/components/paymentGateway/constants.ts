import type { GatewayProviderMeta } from './types';

export const DEFAULT_MISTICPAY_API_URL = 'https://api.misticpay.com/api';
export const DEFAULT_BSPAY_API_URL = 'https://api.bspay.co';
export const DEFAULT_VEOPAG_API_URL = 'https://api.veopag.com';

export const GATEWAY_PROVIDERS: GatewayProviderMeta[] = [
  {
    id: 'misticpay',
    label: 'MisticPay',
    description: 'Headers CI/CS · webhook X-MisticPay-Secret',
  },
  {
    id: 'bspay',
    label: 'BSPay',
    description: 'OAuth + HMAC para saques',
  },
  {
    id: 'veopag',
    label: 'VeoPag',
    description: 'JWT · whitelist de IP para saques',
  },
];
