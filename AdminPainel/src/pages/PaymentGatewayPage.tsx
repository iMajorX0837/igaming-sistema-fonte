import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, KeyRound, Settings2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PagePanel from '../components/ui/PagePanel';
import LoadingState from '../components/ui/LoadingState';
import GatewayActivePanel from '../components/paymentGateway/GatewayActivePanel';
import GatewayConfigPanel from '../components/paymentGateway/GatewayConfigPanel';
import { usePaymentGatewayConfig } from '../components/paymentGateway/usePaymentGatewayConfig';

type GatewayTab = 'ativos' | 'credenciais';

const TABS: { key: GatewayTab; label: string; icon: typeof Settings2; description: string }[] = [
  {
    key: 'ativos',
    label: 'Gateways ativos',
    icon: Settings2,
    description: 'Defina qual provedor PIX processa depósitos e qual processa saques.',
  },
  {
    key: 'credenciais',
    label: 'Credenciais',
    icon: KeyRound,
    description: 'Client ID, secrets e webhooks de MisticPay, BSPay e VeoPag.',
  },
];

const VALID_TABS = new Set<string>(TABS.map((tab) => tab.key));

function parseTab(value: string | null): GatewayTab {
  if (value && VALID_TABS.has(value)) return value as GatewayTab;
  return 'ativos';
}

export default function PaymentGatewayPage() {
  const config = usePaymentGatewayConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => parseTab(searchParams.get('tab')), [searchParams]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && !VALID_TABS.has(tab)) {
      setSearchParams({ tab: 'ativos' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const setActiveTab = (tab: GatewayTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const activeMeta = TABS.find((tab) => tab.key === activeTab)!;

  if (config.loading) {
    return <LoadingState message="Carregando gateways..." />;
  }

  return (
    <div className="w-full">
      <PageHeader
        icon={CreditCard}
        title="Gateway de Pagamentos"
        description="Configure provedores PIX, escolha gateways separados para depósitos e saques, e gerencie credenciais."
      />

      <PagePanel padding={false} className="w-full overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-admin-border px-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-medium transition-colors -mb-px ${
                  isActive
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 md:p-6">
          <p className="mb-5 text-sm text-admin-muted">{activeMeta.description}</p>

          {activeTab === 'ativos' && <GatewayActivePanel config={config} />}
          {activeTab === 'credenciais' && <GatewayConfigPanel config={config} />}
        </div>
      </PagePanel>
    </div>
  );
}
