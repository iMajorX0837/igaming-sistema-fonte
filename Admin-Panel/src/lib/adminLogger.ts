import { supabase } from './supabase';

export type AdminLogStatus = 'sucesso' | 'falha';

export type AdminLogCategory =
  | 'sistema'
  | 'saque'
  | 'deposito'
  | 'usuario'
  | 'cupom'
  | 'roleta'
  | 'jogo'
  | 'site'
  | 'vip'
  | 'config'
  | 'equipe';

interface LogAdminActionParams {
  acao: string;
  detalhes?: string;
  status?: AdminLogStatus;
  categoria?: AdminLogCategory;
  metadata?: Record<string, unknown>;
}

export async function logAdminAction({
  acao,
  detalhes,
  status = 'sucesso',
  categoria = 'sistema',
  metadata = {},
}: LogAdminActionParams): Promise<void> {
  try {
    await supabase.rpc('registrar_admin_log', {
      p_acao: acao,
      p_detalhes: detalhes ?? null,
      p_status: status,
      p_categoria: categoria,
      p_metadata: metadata,
    });
  } catch {
    // Log não deve bloquear a operação principal
  }
}
