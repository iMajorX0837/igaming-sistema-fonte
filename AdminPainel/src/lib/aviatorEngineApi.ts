function apiBase() {
  // Dev: Vite proxy (vite.config.ts). Prod: nginx admin.*/aviator → API.
  return '';
}

async function authHeaders() {
  const { supabase } = await import('./supabase');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Faça login novamente.');
  return { Authorization: `Bearer ${token}` };
}

export interface AviatorScheduleEntry {
  index?: number;
  round_id: number;
  queue_position?: number | null;
  crash_mul: number;
  crash_x: number;
  bet_start_ms?: number;
  bet_start_at?: string;
  crash_at_ms: number;
  crash_at: string;
  seconds_until_crash?: number;
  status: string;
  phase: string;
  is_live: boolean;
  is_past?: boolean;
}

export interface AviatorRtpPreview {
  ok: boolean;
  engine: Record<string, unknown>;
  queue: {
    upcoming?: Array<{ crashX?: number; crashMul?: number }>;
    current?: { crashX?: number; roundId?: number } | null;
    timeline?: {
      server_time_ms: number;
      server_time: string;
      schedule: AviatorScheduleEntry[];
      live_round?: AviatorScheduleEntry | null;
      upcoming?: AviatorScheduleEntry[];
      past?: AviatorScheduleEntry[];
      live?: Record<string, unknown>;
    };
  };
}

export async function fetchAviatorRtpPreview(): Promise<AviatorRtpPreview> {
  const headers = await authHeaders();
  const res = await fetch(`${apiBase()}/aviator/admin/rtp-preview`, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || 'Falha ao carregar preview RTP');
  }
  return body as AviatorRtpPreview;
}

export async function invalidateAviatorQueue() {
  const headers = {
    ...(await authHeaders()),
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${apiBase()}/aviator/admin/invalidate-queue`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  const body = await res.json();
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || 'Falha ao invalidar fila de velas');
  }
  return body;
}
