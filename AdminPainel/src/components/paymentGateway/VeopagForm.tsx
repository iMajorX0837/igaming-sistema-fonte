import { Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import { DEFAULT_VEOPAG_API_URL } from './constants';
import { gatewayInputClassName, UpdatedAtFooter, WebhookNote } from './ui';
import type { PaymentGatewayConfig } from './usePaymentGatewayConfig';

interface VeopagFormProps {
  config: PaymentGatewayConfig;
}

export default function VeopagForm({ config }: VeopagFormProps) {
  const v = config.veopag;

  return (
    <div className="grid gap-5 max-w-xl">
      <FormField label="Client ID" hint="Gerado em dashboard.veopag.com/credentials">
        <input
          className={gatewayInputClassName}
          value={v.clientId}
          onChange={(e) => v.setClientId(e.target.value)}
          placeholder="client_id"
          autoComplete="off"
        />
      </FormField>

      <FormField
        label="Client Secret"
        hint={
          v.clientSecretConfigured
            ? 'Já configurado. Deixe em branco para manter.'
            : 'Obrigatório na primeira configuração (exibido apenas uma vez).'
        }
      >
        <input
          type="password"
          className={gatewayInputClassName}
          value={v.clientSecret}
          onChange={(e) => v.setClientSecret(e.target.value)}
          placeholder={v.clientSecretConfigured ? '••••••••••••' : 'client_secret'}
          autoComplete="new-password"
        />
      </FormField>

      <FormField label="URL da API" hint={`Padrão: ${DEFAULT_VEOPAG_API_URL}`}>
        <input
          className={gatewayInputClassName}
          value={v.apiUrl}
          onChange={(e) => v.setApiUrl(e.target.value)}
          placeholder={DEFAULT_VEOPAG_API_URL}
          autoComplete="off"
        />
      </FormField>

      <FormField
        label="Webhook Signature"
        hint={
          v.webhookConfigured
            ? 'HMAC: X-Webhook-Signature + X-Webhook-Timestamp'
            : 'Opcional, recomendado em produção.'
        }
      >
        <input
          type="password"
          className={gatewayInputClassName}
          value={v.webhookSecret}
          onChange={(e) => v.setWebhookSecret(e.target.value)}
          placeholder={v.webhookConfigured ? '••••••••••••' : 'webhook_signature'}
          autoComplete="new-password"
        />
      </FormField>

      <UpdatedAtFooter updatedAt={v.updatedAt} />

      <Button onClick={() => void v.handleSave()} disabled={v.saving}>
        {v.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Salvar VeoPag
      </Button>

      <WebhookNote>
        Saques exigem IP na whitelist do painel VeoPag. Webhook:{' '}
        <code className="text-admin-foreground/80">/api/withdraw/veopag/webhook</code>
        {' · '}
        Documentação:{' '}
        <a
          href="https://veopag.readme.io/"
          target="_blank"
          rel="noreferrer"
          className="text-admin-accent hover:underline"
        >
          veopag.readme.io
        </a>
      </WebhookNote>
    </div>
  );
}
