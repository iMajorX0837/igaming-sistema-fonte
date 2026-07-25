const ADMIN_CLIENT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-client-info': 'admin-panel',
};

/** Fetch autenticado do painel — sessão via cookies HttpOnly (H7). */
export function adminApiFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(ADMIN_CLIENT_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}
