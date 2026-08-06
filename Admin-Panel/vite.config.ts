import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const playFiversProxyTarget =
    env.VITE_PLAYFIVERS_PROXY?.trim() || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      port: 3002,
      open: true,
      allowedHosts: [
        'admin.royall.bet',
        'moderators-saves-laboratory-martin.trycloudflare.com',
        '.trycloudflare.com',
      ],
      proxy: {
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
        '/api/supabase': {
          target: playFiversProxyTarget,
          changeOrigin: true,
          secure: playFiversProxyTarget.startsWith('https'),
        },
        '/api/webhooks': {
          target: playFiversProxyTarget,
          changeOrigin: true,
          secure: playFiversProxyTarget.startsWith('https'),
        },
        '/api/withdraw': {
          target: playFiversProxyTarget,
          changeOrigin: true,
          secure: playFiversProxyTarget.startsWith('https'),
        },
        '/aviator/admin': {
          target: playFiversProxyTarget,
          changeOrigin: true,
          secure: playFiversProxyTarget.startsWith('https'),
        },
      },
    },
  };
});
