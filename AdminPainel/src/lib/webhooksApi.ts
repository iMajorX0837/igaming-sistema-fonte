import { supabase } from './supabase';

export async function testWebhook(webhookId: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await fetch('/api/webhooks/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ webhook_id: webhookId }),
  });

  if (response.status === 401) {
    await supabase.auth.signOut();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || 'Falha ao testar webhook');
  }

  return payload;
}

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
