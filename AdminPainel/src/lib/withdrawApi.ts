import { supabase } from './supabase';

export interface ApproveWithdrawResult {
  ok: boolean;
  message?: string;
  saque_id?: string;
  misticpay?: {
    jobId?: string;
    transactionId?: string;
    status?: string;
    message?: string;
  };
}

export async function approveWithdraw(saqueId: string): Promise<ApproveWithdrawResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await fetch('/api/withdraw/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ saque_id: saqueId }),
  });

  if (response.status === 401) {
    await supabase.auth.signOut();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const payload = (await response.json()) as ApproveWithdrawResult & { message?: string };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || 'Erro ao aprovar saque.');
  }

  return payload;
}
