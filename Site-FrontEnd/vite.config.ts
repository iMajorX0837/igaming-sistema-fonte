import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const gameLaunchTarget =
    env.VITE_GAME_LAUNCH_PROXY?.trim() || 'http://localhost:3000';
  const playFiversProxyTarget =
    env.VITE_PLAYFIVERS_PROXY?.trim() || 'http://localhost:3000';

  const apiProxy = {
    '/api/game_launch': {
      target: gameLaunchTarget,
      changeOrigin: true,
      secure: gameLaunchTarget.startsWith('https'),
    },
    '/api/free_bonus': {
      target: gameLaunchTarget,
      changeOrigin: true,
      secure: gameLaunchTarget.startsWith('https'),
    },
    '/api/prize_wheel': {
      target: gameLaunchTarget,
      changeOrigin: true,
      secure: gameLaunchTarget.startsWith('https'),
    },
    '/api/deposit': {
      target: gameLaunchTarget,
      changeOrigin: true,
      secure: gameLaunchTarget.startsWith('https'),
    },
    '/api/supabase': {
      target: gameLaunchTarget,
      changeOrigin: true,
      secure: gameLaunchTarget.startsWith('https'),
    },
    '/api/cpfhub': {
      target: gameLaunchTarget,
      changeOrigin: true,
      secure: gameLaunchTarget.startsWith('https'),
    },
    '/api/webhooks': {
      target: gameLaunchTarget,
      changeOrigin: true,
      secure: gameLaunchTarget.startsWith('https'),
    },
    '/api/v2': {
      target: playFiversProxyTarget,
      changeOrigin: true,
      secure: playFiversProxyTarget.startsWith('https'),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader(
            'User-Agent',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
          );
          proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
          proxyReq.setHeader('Accept-Language', 'pt-BR,pt;q=0.9,en;q=0.8');
        });
      },
    },
  };

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
  };
});
