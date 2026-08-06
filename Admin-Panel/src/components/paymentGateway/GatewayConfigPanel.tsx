import { useEffect, useState } from 'react';
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

const labelMap: Record<PaymentGatewayId, string> = {
  misticpay: 'MisticPay',
  bspay: 'BSPay',
  veopag: 'VeoPag',
};

function roleBadges(config: PaymentGatewayConfig, id: PaymentGatewayId) {
  const badges: string[] = [];
  if (config.activeDepositGateway === id) badges.push('Depósito');
  if (config.activeWithdrawGateway === id) badges.push('Saque');
  return badges;
}

export default function GatewayConfigPanel({ config }: GatewayConfigPanelProps) {
  const [configTab, setConfigTab] = useState<PaymentGatewayId>(config.activeDepositGateway);

  useEffect(() => {
    setConfigTab(config.activeDepositGateway);
  }, [config.activeDepositGateway]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-admin-border bg-admin-panel-2/20">
      <div className="flex gap-1 overflow-x-auto border-b border-admin-border px-4 md:px-5">
        {GATEWAY_PROVIDERS.map((provider) => {
          const isActive = configTab === provider.id;
          const roles = roleBadges(config, provider.id);

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => setConfigTab(provider.id)}
              className={`flex min-w-[132px] flex-col items-start gap-0.5 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition-colors -mb-px ${
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                {provider.label}
                {roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400"
                  >
                    {role}
                  </span>
                ))}
              </span>
              <span className="text-xs font-normal">
                <ConfigStatusBadge configured={configuredById(config, provider.id)} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-b border-admin-border bg-admin-panel-2/30 px-5 py-3 text-xs text-admin-muted md:px-6">
        Ativos agora: depósitos em{' '}
        <strong className="text-admin-foreground">{labelMap[config.activeDepositGateway]}</strong>, saques
        em <strong className="text-admin-foreground">{labelMap[config.activeWithdrawGateway]}</strong>
      </div>

      <div className="p-5 md:p-6">
        {configTab === 'misticpay' && <MisticPayForm config={config} />}
        {configTab === 'bspay' && <BspayForm config={config} />}
        {configTab === 'veopag' && <VeopagForm config={config} />}
      </div>
    </div>
  );
}
