import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name        : 'Kairos Way',
        short_name  : 'Kairos',
        description : 'Gateway de Pagamentos White Label',
        theme_color       : '#0055FE',
        background_color  : '#02030B',
        display           : 'standalone',
        orientation       : 'portrait',
        scope     : '/',
        start_url : '/',   // FIX F-51: não forçar /admin — cada role tem seu path
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // FIX F-50: dados financeiros e relatórios NUNCA do cache — sempre da rede
          {
            urlPattern: /\/financial\//,
            handler   : 'NetworkOnly',
          },
          {
            urlPattern: /\/reports\//,
            handler   : 'NetworkOnly',
          },
          {
            urlPattern: /\/audit/,
            handler   : 'NetworkOnly',
          },
          {
            urlPattern: /\/admin\/dashboard/,
            handler   : 'NetworkOnly',
          },
          // Dados de produtos/ofertas podem usar cache curto (30s)
          {
            urlPattern: /^https:\/\/api\.kairosway\.com\.br\/.*/,
            handler   : 'NetworkFirst',
            options   : {
              cacheName  : 'api-cache',
              networkTimeoutSeconds: 5,
              expiration : { maxEntries: 50, maxAgeSeconds: 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target      : 'http://localhost:3333',  // FIX F-49: era 3000
        changeOrigin: true,
        rewrite     : (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});