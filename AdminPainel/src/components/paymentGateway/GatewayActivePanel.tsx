import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import { GATEWAY_ROLES } from './constants';
import GatewayRoleSelector from './GatewayRoleSelector';
import { SectionTitle } from './ui';
import type { PaymentGatewayConfig } from './usePaymentGatewayConfig';
import type { PaymentGatewayId } from './types';

interface GatewayActivePanelProps {
  config: PaymentGatewayConfig;
}

const labelMap: Record<PaymentGatewayId, string> = {
  misticpay: 'MisticPay',
  bspay: 'BSPay',
  veopag: 'VeoPag',
};

export default function GatewayActivePanel({ config }: GatewayActivePanelProps) {
  const {
    depositGateway,
    activeDepositGateway,
    setDepositGateway,
    withdrawGateway,
    activeWithdrawGateway,
    setWithdrawGateway,
    savingGateway,
    handleSaveGateway,
    misticpayConfigured,
    bspayConfigured,
    veopagConfigured,
  } = config;

  const configuredMap: Record<PaymentGatewayId, boolean> = {
    misticpay: misticpayConfigured,
    bspay: bspayConfigured,
    veopag: veopagConfigured,
  };

  const hasChanges =
    depositGateway !== activeDepositGateway || withdrawGateway !== activeWithdrawGateway;

  return (
    <div className="grid w-full gap-6">
      <div>
        <SectionTitle>Gateways ativos</SectionTitle>
        <p className="-mt-2 text-sm text-admin-muted">
          Escolha provedores diferentes para depósitos e saques, se quiser. Cada um precisa estar
          configurado na aba Credenciais antes de ser ativado.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
          {GATEWAY_ROLES.map((roleMeta) => (
            <GatewayRoleSelector
              key={roleMeta.role}
              config={config}
              roleMeta={roleMeta}
              selected={roleMeta.role === 'deposit' ? depositGateway : withdrawGateway}
              active={roleMeta.role === 'deposit' ? activeDepositGateway : activeWithdrawGateway}
              onSelect={roleMeta.role === 'deposit' ? setDepositGateway : setWithdrawGateway}
            />
        ))}
      </div>

      <div className="rounded-xl border border-admin-border bg-admin-panel-2/30 px-4 py-3 text-sm text-admin-muted">
        <span className="font-medium text-admin-foreground">Resumo atual:</span>{' '}
        Depósitos via <strong className="text-admin-foreground">{labelMap[activeDepositGateway]}</strong>
        {' · '}
        Saques via <strong className="text-admin-foreground">{labelMap[activeWithdrawGateway]}</strong>
        {hasChanges ? (
          <span className="mt-1 block text-amber-400">
            Alterações pendentes: depósitos → {labelMap[depositGateway]}, saques →{' '}
            {labelMap[withdrawGateway]}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void handleSaveGateway()} disabled={savingGateway || !hasChanges}>
          {savingGateway ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar gateways ativos
        </Button>
        {!hasChanges ? (
          <span className="text-xs text-admin-muted">Nenhuma alteração para salvar.</span>
        ) : null}
        {!configuredMap[depositGateway] || !configuredMap[withdrawGateway] ? (
          <span className="text-xs text-amber-400">
            Configure as credenciais dos gateways selecionados antes de salvar.
          </span>
        ) : null}
      </div>
    </div>
  );
}
