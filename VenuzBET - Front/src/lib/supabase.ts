import { createSupabaseProxyClient } from './supabaseProxyClient';

/** Cliente Supabase via PlayFiverAPI — credenciais ficam no servidor. */
export const supabase = createSupabaseProxyClient();
