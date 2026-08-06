import { supabase } from './supabase';
import { adminApiFetch } from './adminApiFetch';

export interface WebhookPublic {
  id: string;
  nome: string;
  url: string;
  evento: string;
  secret_prefix: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

async function parseAdminResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    await supabase.auth.signOut();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || 'Erro na requisição');
  }

  return payload as T;
}

export async function listWebhooks(): Promise<WebhookPublic[]> {
  const response = await adminApiFetch('/api/webhooks');
  const payload = await parseAdminResponse<{ data: WebhookPublic[] }>(response);
  return payload.data ?? [];
}

export async function createWebhook(input: {
  nome: string;
  url: string;
  evento: string;
  ativo?: boolean;
}): Promise<{ webhook: WebhookPublic; secret_once: string }> {
  const response = await adminApiFetch('/api/webhooks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const payload = await parseAdminResponse<{ data: WebhookPublic; secret_once: string }>(response);
  return { webhook: payload.data, secret_once: payload.secret_once };
}

export async function updateWebhook(
  id: string,
  input: Partial<{ nome: string; url: string; evento: string; ativo: boolean }>
): Promise<WebhookPublic> {
  const response = await adminApiFetch(`/api/webhooks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const payload = await parseAdminResponse<{ data: WebhookPublic }>(response);
  return payload.data;
}

export async function rotateWebhookSecret(
  id: string
): Promise<{ webhook: WebhookPublic; secret_once: string }> {
  const response = await adminApiFetch(`/api/webhooks/${id}/rotate-secret`, {
    method: 'POST',
  });
  const payload = await parseAdminResponse<{ data: WebhookPublic; secret_once: string }>(response);
  return { webhook: payload.data, secret_once: payload.secret_once };
}

export async function deleteWebhook(id: string): Promise<void> {
  const response = await adminApiFetch(`/api/webhooks/${id}`, {
    method: 'DELETE',
  });
  await parseAdminResponse(response);
}

export async function testWebhook(webhookId: string) {
  const response = await adminApiFetch('/api/webhooks/test', {
    method: 'POST',
    body: JSON.stringify({ webhook_id: webhookId }),
  });
  return parseAdminResponse<{
    message: string;
    delivery_id: string;
    http_status: number;
  }>(response);
}
