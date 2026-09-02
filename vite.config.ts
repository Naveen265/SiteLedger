import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/** Resolves a path relative to this config file, without relying on __dirname. */
function fromRoot(relative: string): string {
  return path.resolve(import.meta.dirname, relative);
}

/**
 * Vite configuration.
 *
 * `loadEnv` is called with an empty prefix so this file can read the two
 * server-side Supabase variables. They are used only to configure the dev
 * proxy below and are never exposed to client code: Vite inlines
 * `import.meta.env` values, and only `VITE_` prefixed variables are eligible
 * for that. Nothing here reaches a bundle.
 */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // A missing project URL would otherwise surface much later as an unexplained
  // proxy failure on the first sign-in attempt. Say so now, and say where to
  // fix it. Only the dev server needs this; a production build does not, since
  // the credentials are read by the Vercel Function at request time.
  if (command === 'serve' && !env.SUPABASE_URL) {
    throw new Error(
      'Missing SUPABASE_URL. Copy .env.example to .env.local and fill in your ' +
        'Supabase project URL and anon key. Both are server-side only and are ' +
        'never sent to the browser.',
    );
  }

  return {
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
        // index.html is deliberately NOT precached. Precaching it serves the
        // application shell cache-first, which pins the browser to whichever
        // build was current when the worker installed: a deployed fix then
        // never reaches anyone until they clear site data. skipWaiting alone
        // does not solve it, because the already-rendered page came from the
        // old cache. Hashed assets below are safe to precache, since their
        // names change whenever their contents do.
        globPatterns: ['**/*.{js,css,svg,png,woff2}'],

        // A new build must take over immediately. Without these, the previous
        // service worker keeps serving the old application shell until every
        // tab is closed, so a deployed fix appears not to have deployed. That
        // cost a full debugging cycle: the server was correct and the browser
        // was running week-old JavaScript.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,

        // Workbox otherwise registers a NavigationRoute bound to a precached
        // index.html, and registers it BEFORE the runtime rules below, so it
        // wins for every navigation and serves the shell cache-first. That is
        // the mechanism that kept serving a stale build after a deploy.
        // Disabled here so the NetworkFirst rule below handles navigations;
        // it falls back to its own cache when genuinely offline.
        navigateFallback: undefined,

        runtimeCaching: [
          {
            // The shell comes from the network whenever the network answers,
            // so a deploy is live on the next load. The cached copy is the
            // offline fallback, not the default.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'siteledger-shell',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 4 },
            },
          },
          {
            // Uploaded photos already viewed: serve from cache for 30 days.
            urlPattern: /\/storage\/v1\/object\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'siteledger-media',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Everything else through the proxy is per-user and never cached.
            urlPattern: /\/api\/supabase\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fromRoot('./src') },
  },

  server: {
    /**
     * The development stand-in for `api/supabase/[...path].ts`.
     * Vite does not run Vercel Functions, so the same credential injection is
     * reproduced here. Behaviour matches production: the browser only ever
     * talks to localhost, and the key is attached by the dev server.
     */
    proxy: {
      '/api/supabase': {
        target: env.SUPABASE_URL,
        changeOrigin: true,
        secure: true,
        rewrite: (requestPath: string) => requestPath.replace(/^\/api\/supabase/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('apikey', env.SUPABASE_ANON_KEY ?? '');
            // Preserve the signed-in user's own token so Row Level Security
            // applies to them, exactly as it does in production.
            if (!proxyReq.getHeader('authorization')) {
              proxyReq.setHeader('authorization', `Bearer ${env.SUPABASE_ANON_KEY ?? ''}`);
            }
          });
        },
      },
    },
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
  };
});
