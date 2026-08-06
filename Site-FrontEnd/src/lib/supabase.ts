import { createSupabaseProxyClient } from './supabaseProxyClient';

/** Cliente Supabase via API-BackEnd — credenciais ficam no servidor. */
export const supabase = createSupabaseProxyClient();
