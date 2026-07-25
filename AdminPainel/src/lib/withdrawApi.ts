import { supabase } from './supabase';
import { adminApiFetch } from './adminApiFetch';

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
  if (!data.session?.user) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await adminApiFetch('/api/withdraw/approve', {
    method: 'POST',
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
