import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import { GATEWAY_PROVIDERS } from './constants';
import { ConfigStatusBadge } from './ui';
import type { PaymentGatewayConfig } from './usePaymentGatewayConfig';
import type { GatewayRoleMeta, PaymentGatewayId } from './types';

interface GatewayRoleSelectorProps {
  config: PaymentGatewayConfig;
  roleMeta: GatewayRoleMeta;
  selected: PaymentGatewayId;
  active: PaymentGatewayId;
  onSelect: (id: PaymentGatewayId) => void;
}

const roleIcon = {
  deposit: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
} as const;

const configuredById = (config: PaymentGatewayConfig, id: PaymentGatewayId) => {
  if (id === 'misticpay') return config.misticpayConfigured;
  if (id === 'bspay') return config.bspayConfigured;
  return config.veopagConfigured;
};

export default function GatewayRoleSelector({
  config,
  roleMeta,
  selected,
  active,
  onSelect,
}: GatewayRoleSelectorProps) {
  const Icon = roleIcon[roleMeta.role];

  return (
    <section className="rounded-xl border border-admin-border bg-admin-panel-2/40 p-4 md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-admin-accent/10 text-admin-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-admin-foreground">{roleMeta.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-admin-muted">{roleMeta.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GATEWAY_PROVIDERS.map((provider) => {
          const isSelected = selected === provider.id;
          const isConfigured = configuredById(config, provider.id);
          const isLive = active === provider.id;

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelect(provider.id)}
              className={`rounded-xl border p-3.5 text-left transition-all ${
                isSelected
                  ? 'border-admin-accent bg-admin-accent/8 ring-1 ring-admin-accent/25'
                  : 'border-admin-border bg-admin-panel hover:border-admin-border-strong'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-admin-foreground">{provider.label}</span>
                {isLive ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Em uso
                  </span>
                ) : isSelected ? (
                  <span className="shrink-0 rounded-full bg-admin-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-admin-accent">
                    Selecionado
                  </span>
                ) : null}
              </div>
              <p className="mb-2 text-xs text-admin-muted">{provider.description}</p>
              <p className="text-xs">
                <ConfigStatusBadge configured={isConfigured} />
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
