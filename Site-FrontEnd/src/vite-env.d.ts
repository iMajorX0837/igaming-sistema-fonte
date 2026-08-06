/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FREE_BONUS_URL?: string;
  readonly VITE_PRIZE_WHEEL_GRANT_URL?: string;
  readonly VITE_API_BASE?: string;
  /** Base path da API de depósitos PIX (ex.: /api/deposit). Em dev o Vite usa proxy automático. */
  readonly VITE_DEPOSIT_API_BASE?: string;
  /** URL do game_launch no browser (padrão: /api/game_launch no mesmo origin). */
  readonly VITE_GAME_LAUNCH_URL?: string;
  /** Só vite.config: destino do proxy /api/game_launch em dev (ex.: http://localhost:3000). */
  readonly VITE_GAME_LAUNCH_PROXY?: string;
  /** Base path da API PlayFivers no browser (ex.: /api/v2). Em dev o Vite usa proxy automático. */
  readonly VITE_PLAYFIVERS_API_BASE?: string;
  /** Só vite.config: destino do proxy /api/v2 em dev (ex.: http://localhost:3000). */
  readonly VITE_PLAYFIVERS_PROXY?: string;
}
