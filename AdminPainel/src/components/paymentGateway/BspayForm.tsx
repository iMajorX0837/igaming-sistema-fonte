import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import { DEFAULT_BSPAY_API_URL } from './constants';
import { gatewayInputClassName, UpdatedAtFooter, WebhookNote } from './ui';
import type { PaymentGatewayConfig } from './usePaymentGatewayConfig';

interface BspayFormProps {
  config: PaymentGatewayConfig;
}

export default function BspayForm({ config }: BspayFormProps) {
  const b = config.bspay;

  return (
    <div className="grid gap-5 max-w-xl">
      <FormField label="Client ID" hint="OAuth client_id da BSPay">
        <input
          className={gatewayInputClassName}
          value={b.clientId}
          onChange={(e) => b.setClientId(e.target.value)}
          placeholder="client_id"
          autoComplete="off"
        />
      </FormField>

      <FormField
        label="Client Secret"
        hint={
          b.clientSecretConfigured
            ? 'Já configurado. Deixe em branco para manter.'
            : 'Obrigatório na primeira configuração.'
        }
      >
        <input
          type="password"
          className={gatewayInputClassName}
          value={b.clientSecret}
          onChange={(e) => b.setClientSecret(e.target.value)}
          placeholder={b.clientSecretConfigured ? '••••••••••••' : 'client_secret'}
          autoComplete="new-password"
        />
      </FormField>

      <FormField
        label="Signing Key (HMAC)"
        hint={
          b.signingKeyConfigured
            ? 'Necessária para saques. Diferente do client_secret.'
            : 'Gere no Dashboard BSPay ao habilitar HMAC.'
        }
      >
        <input
          type="password"
          className={gatewayInputClassName}
          value={b.signingKey}
          onChange={(e) => b.setSigningKey(e.target.value)}
          placeholder={b.signingKeyConfigured ? '••••••••••••' : 'signing_key'}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="URL da API" hint={`Padrão: ${DEFAULT_BSPAY_API_URL}`}>
        <input
          className={gatewayInputClassName}
          value={b.apiUrl}
          onChange={(e) => b.setApiUrl(e.target.value)}
          placeholder={DEFAULT_BSPAY_API_URL}
          autoComplete="off"
        />
      </FormField>

      <FormField
        label="Webhook secret (saques)"
        hint={
          b.webhookConfigured
            ? 'Valida header X-Webhook-Signature'
            : 'Opcional, recomendado em produção.'
        }
      >
        <input
          type="password"
          className={gatewayInputClassName}
          value={b.webhookSecret}
          onChange={(e) => b.setWebhookSecret(e.target.value)}
          placeholder={b.webhookConfigured ? '••••••••••••' : 'webhook_secret'}
          autoComplete="new-password"
        />
      </FormField>

      <UpdatedAtFooter updatedAt={b.updatedAt} />

      <Button onClick={() => void b.handleSave()} disabled={b.saving}>
        {b.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar BSPay
      </Button>

      <WebhookNote>
        Webhook de saque BSPay:{' '}
        <code className="text-admin-foreground/80">/api/withdraw/bspay/webhook</code>
        {' · '}
        Documentação:{' '}
        <a
          href="https://doc.bspay.co/introduction"
          target="_blank"
          rel="noreferrer"
          className="text-admin-accent hover:underline"
        >
          doc.bspay.co
        </a>
      </WebhookNote>
    </div>
  );
}
