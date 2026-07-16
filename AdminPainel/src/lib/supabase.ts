import { createSupabaseProxyClient } from './supabaseProxyClient';
import { getCachedDevice, getCachedIp } from './clientInfo';

/** Cliente Supabase via PlayFiverAPI — credenciais ficam no servidor. */
export const supabase = createSupabaseProxyClient({
  extraHeaders: () => {
    const headers: Record<string, string> = { 'x-client-info': 'admin-panel' };
    const ip = getCachedIp();
    const device = getCachedDevice();
    if (ip) headers['x-admin-ip'] = ip;
    if (device) headers['x-admin-device'] = device;
    return headers;
  },
});
