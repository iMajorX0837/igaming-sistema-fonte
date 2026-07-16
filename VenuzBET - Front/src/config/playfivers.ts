/** Em dev, o Vite faz proxy de /api/v2 → PlayFiverAPI local (VITE_PLAYFIVERS_PROXY). */
function getPlayFiversApiBase(): string {
  const fromEnv = import.meta.env.VITE_PLAYFIVERS_API_BASE?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '/api/v2';
  }
  throw new Error(
    'Defina VITE_PLAYFIVERS_API_BASE no .env (ex.: /api/v2) — o navegador usa proxy no mesmo origin para evitar CORS.'
  );
}

export const PLAYFIVERS_API_V2 = getPlayFiversApiBase();
