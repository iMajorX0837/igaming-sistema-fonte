import { useEffect, useState } from 'react';
import PagePanel from '../ui/PagePanel';
import BspayForm from './BspayForm';
import { GATEWAY_PROVIDERS } from './constants';
import MisticPayForm from './MisticPayForm';
import { ConfigStatusBadge } from './ui';
import type { PaymentGatewayConfig } from './usePaymentGatewayConfig';
import type { PaymentGatewayId } from './types';
import VeopagForm from './VeopagForm';

interface GatewayConfigPanelProps {
  config: PaymentGatewayConfig;
}

const configuredById = (config: PaymentGatewayConfig, id: PaymentGatewayId) => {
  if (id === 'misticpay') return config.misticpayConfigured;
  if (id === 'bspay') return config.bspayConfigured;
  return config.veopagConfigured;
};

export default function GatewayConfigPanel({ config }: GatewayConfigPanelProps) {
  const [configTab, setConfigTab] = useState<PaymentGatewayId>(config.activeGateway);

  useEffect(() => {
    setConfigTab(config.activeGateway);
  }, [config.activeGateway]);

  return (
    <PagePanel padding={false} className="overflow-hidden !p-0">
      <div className="px-5 md:px-6 pt-5 md:pt-6 pb-4 border-b border-admin-border">
        <h2 className="text-base font-semibold text-admin-foreground">Credenciais</h2>
        <p className="text-sm text-admin-muted mt-1">
          Configure cada provedor independentemente. Apenas o gateway ativo processará pagamentos.
        </p>
      </div>

      <div className="flex border-b border-admin-border overflow-x-auto px-4 md:px-6 gap-1">
        {GATEWAY_PROVIDERS.map((provider) => {
          const isActive = configTab === provider.id;
          const isLive = config.activeGateway === provider.id;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => setConfigTab(provider.id)}
              className={`flex flex-col items-start gap-0.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px min-w-[120px] ${
                isActive
                  ? 'text-white border-white'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                {provider.label}
                {isLive ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                    Ativo
                  </span>
                ) : null}
              </span>
              <span className="text-xs font-normal">
                <ConfigStatusBadge configured={configuredById(config, provider.id)} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-5 md:p-6">
        {configTab === 'misticpay' && <MisticPayForm config={config} />}
        {configTab === 'bspay' && <BspayForm config={config} />}
        {configTab === 'veopag' && <VeopagForm config={config} />}
      </div>
    </PagePanel>
  );
}
