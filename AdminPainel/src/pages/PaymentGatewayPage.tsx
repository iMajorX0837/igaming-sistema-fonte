import { CreditCard } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import GatewayActivePanel from '../components/paymentGateway/GatewayActivePanel';
import GatewayConfigPanel from '../components/paymentGateway/GatewayConfigPanel';
import { usePaymentGatewayConfig } from '../components/paymentGateway/usePaymentGatewayConfig';

export default function PaymentGatewayPage() {
  const config = usePaymentGatewayConfig();

  if (config.loading) {
    return <LoadingState message="Carregando gateways..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Gateway de Pagamentos"
        description="Escolha o provedor PIX ativo e configure as credenciais de MisticPay, BSPay e VeoPag."
      />

      <GatewayActivePanel config={config} />
      <GatewayConfigPanel config={config} />
    </div>
  );
}
