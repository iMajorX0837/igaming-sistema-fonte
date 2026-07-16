/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PLAYFIVERS_API_BASE?: string;
  readonly VITE_PLAYFIVERS_PROXY?: string;
  readonly VITE_PLAYFIVERS_QUEUE_CONCURRENCY?: string;
  readonly VITE_PLAYFIVERS_QUEUE_INTERVAL_MS?: string;
}
