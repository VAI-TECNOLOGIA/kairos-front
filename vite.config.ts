import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType : 'autoUpdate',
      injectRegister: false,                  // registramos manualmente em src/registerSW.ts (auto-reload silencioso)
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      // PWA: permite testar SW em dev (npm run dev), além do build
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/index.html',
      },
      manifest: {
        // Identificação (campos novos pra subir score do PWABuilder)
        id          : '/',
        name        : 'Kairos Way',
        short_name  : 'Kairos',
        description : 'Gateway de Pagamentos White Label',
        lang        : 'pt-BR',
        dir         : 'ltr',
        categories  : ['finance', 'business', 'productivity'],
        prefer_related_applications: false,

        // Display
        theme_color       : '#0055FE',
        background_color  : '#09131D',
        display           : 'standalone',
        display_override  : ['window-controls-overlay', 'standalone'],
        orientation       : 'portrait',
        scope     : '/',
        start_url : '/',   // FIX F-51: não forçar /admin — cada role tem seu path

        // Ícones separados: 'any' (uso normal) e 'maskable' (Android crop circular/squircle)
        icons: [
          { src: 'pwa-192x192.png',      sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png',      sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],

        // Screenshots: aparecem na PWABuilder e Play Store (Richer Install UI)
        screenshots: [
          // Desktop (form_factor: wide)
          { src: 'screenshots/screenshot-desktop-1.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide',   label: 'Dashboard - Visão geral da plataforma' },
          { src: 'screenshots/screenshot-desktop-2.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide',   label: 'Recebimentos - Calendário financeiro' },
          { src: 'screenshots/screenshot-desktop-3.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide',   label: 'Relatórios - Performance por produto' },
          { src: 'screenshots/screenshot-desktop-4.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide',   label: 'Tema claro disponível' },
          // Mobile (form_factor: narrow)
          { src: 'screenshots/screenshot-mobile-1.png',  sizes: '390x667',  type: 'image/png', form_factor: 'narrow', label: 'Painel Mobile - KPIs em tempo real' },
          { src: 'screenshots/screenshot-mobile-2.png',  sizes: '390x667',  type: 'image/png', form_factor: 'narrow', label: 'Pixels de Rastreamento - Meta, Google, TikTok' },
          { src: 'screenshots/screenshot-mobile-3.png',  sizes: '390x667',  type: 'image/png', form_factor: 'narrow', label: 'Tema claro mobile' },
          { src: 'screenshots/screenshot-mobile-4.png',  sizes: '390x667',  type: 'image/png', form_factor: 'narrow', label: 'Configurações de conta com MFA' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // FIX F-50: dados financeiros e relatórios NUNCA do cache — sempre da rede
          { urlPattern: /\/financial\//,      handler: 'NetworkOnly' },
          { urlPattern: /\/reports\//,        handler: 'NetworkOnly' },
          { urlPattern: /\/audit/,            handler: 'NetworkOnly' },
          { urlPattern: /\/admin\/dashboard/, handler: 'NetworkOnly' },
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
  // Code splitting: divide o bundle de 1.5MB em chunks menores cacheáveis separadamente
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts'      : ['recharts'],
          'icons'       : ['lucide-react', 'react-icons'],
          'react-query' : ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'forms'       : ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils'       : ['axios', 'date-fns', 'clsx', 'zustand', 'react-hot-toast'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
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