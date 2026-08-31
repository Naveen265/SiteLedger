import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// Vite configuration: React SWC/Babel plugin, Tailwind v4 engine, PWA service worker,
// and a `@` alias that maps to `src` so imports never contain `../../..` chains.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'SiteLedger',
        short_name: 'SiteLedger',
        description: 'Construction operations platform for Indian contractors',
        theme_color: '#1B4965',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/site',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Uploaded photos already viewed: serve from cache for 30 days.
            urlPattern: /\/storage\/v1\/object\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'siteledger-media',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // Split the heavy, rarely-changing libraries out of the main bundle so the
    // site shell stays small on low-end Android devices.
    rollupOptions: {
      output: {
        /** Groups a module into a shared chunk by which library it comes from. */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/react-router|react-dom|\/react\//.test(id)) return 'react';
          if (/supabase|tanstack/.test(id)) return 'data';
          if (/recharts|d3-/.test(id)) return 'charts';
          if (/react-hook-form|zod|hookform/.test(id)) return 'forms';
          return undefined;
        },
      },
    },
  },
});
