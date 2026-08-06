import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import { DEFAULT_MISTICPAY_API_URL } from './constants';
import { gatewayInputClassName, UpdatedAtFooter } from './ui';
import type { PaymentGatewayConfig } from './usePaymentGatewayConfig';

interface MisticPayFormProps {
  config: PaymentGatewayConfig;
}

export default function MisticPayForm({ config }: MisticPayFormProps) {
  const m = config.misticpay;

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <FormField label="Client ID (CI)" hint="Header ci nas requisições à MisticPay">
          <input
            className={gatewayInputClassName}
            value={m.ci}
            onChange={(e) => m.setCi(e.target.value)}
            placeholder="ci_..."
            autoComplete="off"
          />
        </FormField>

        <FormField
          label="Client Secret (CS)"
          hint={
            m.csConfigured
              ? 'Já configurado. Deixe em branco para manter.'
              : 'Obrigatório na primeira configuração.'
          }
        >
          <input
            type="password"
            className={gatewayInputClassName}
            value={m.cs}
            onChange={(e) => m.setCs(e.target.value)}
            placeholder={m.csConfigured ? '••••••••••••' : 'cs_...'}
            autoComplete="new-password"
          />
        </FormField>

        <FormField label="URL da API" hint={`Padrão: ${DEFAULT_MISTICPAY_API_URL}`}>
          <input
            className={gatewayInputClassName}
            value={m.apiUrl}
            onChange={(e) => m.setApiUrl(e.target.value)}
            placeholder={DEFAULT_MISTICPAY_API_URL}
            autoComplete="off"
          />
        </FormField>

        <FormField
          label="Webhook secret (saques)"
          hint={
            m.webhookConfigured
              ? 'Já configurado. Header: X-MisticPay-Secret'
              : 'Opcional, recomendado em produção.'
          }
        >
          <input
            type="password"
            className={gatewayInputClassName}
            value={m.webhookSecret}
            onChange={(e) => m.setWebhookSecret(e.target.value)}
            placeholder={m.webhookConfigured ? '••••••••••••' : 'secret do webhook'}
            autoComplete="new-password"
          />
        </FormField>
      </div>

      <UpdatedAtFooter updatedAt={m.updatedAt} />

      <Button onClick={() => void m.handleSave()} disabled={m.saving}>
        {m.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar MisticPay
      </Button>
    </div>
  );
}
