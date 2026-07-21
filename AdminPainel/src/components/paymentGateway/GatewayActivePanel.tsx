import { CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import PagePanel from '../ui/PagePanel';
import { GATEWAY_PROVIDERS } from './constants';
import { ConfigStatusBadge, SectionTitle } from './ui';
import type { PaymentGatewayConfig } from './usePaymentGatewayConfig';
import type { PaymentGatewayId } from './types';

interface GatewayActivePanelProps {
  config: PaymentGatewayConfig;
}

const configuredById = (config: PaymentGatewayConfig, id: PaymentGatewayId) => {
  if (id === 'misticpay') return config.misticpayConfigured;
  if (id === 'bspay') return config.bspayConfigured;
  return config.veopagConfigured;
};

export default function GatewayActivePanel({ config }: GatewayActivePanelProps) {
  const { gateway, activeGateway, setGateway, savingGateway, handleSaveGateway } = config;

  return (
    <PagePanel variant="accent">
      <div className="grid gap-5 max-w-3xl">
        <SectionTitle>Gateway ativo</SectionTitle>
        <p className="text-sm text-admin-muted -mt-2">
          Selecione qual provedor PIX processará depósitos e saques na plataforma.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {GATEWAY_PROVIDERS.map((provider) => {
            const isSelected = gateway === provider.id;
            const isConfigured = configuredById(config, provider.id);
            const isLive = activeGateway === provider.id;

            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => setGateway(provider.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-admin-accent bg-admin-accent/8 ring-1 ring-admin-accent/25'
                    : 'border-admin-border bg-admin-panel-2 hover:border-admin-border-strong'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-admin-foreground">{provider.label}</span>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Em uso
                    </span>
                  ) : isSelected ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-admin-accent bg-admin-accent/15 px-2 py-0.5 rounded-full shrink-0">
                      Selecionado
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-admin-muted mb-2">{provider.description}</p>
                <p className="text-xs">
                  <ConfigStatusBadge configured={isConfigured} />
                </p>
              </button>
            );
          })}
        </div>

        <Button onClick={() => void handleSaveGateway()} disabled={savingGateway}>
          {savingGateway ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Salvar gateway ativo
        </Button>
      </div>
    </PagePanel>
  );
}
