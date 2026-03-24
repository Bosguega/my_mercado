import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const normalizeBase = (value) => {
    if (!value) return undefined;
    let base = value.trim();
    if (!base) return undefined;
    if (!base.startsWith('/')) base = `/${base}`;
    if (!base.endsWith('/')) base += '/';
    return base;
  };

  const baseOverride = normalizeBase(env.VITE_BASE_URL);
  const githubRepo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const isGitHubPagesBuild =
    process.env.GITHUB_ACTIONS === 'true' &&
    Boolean(githubRepo) &&
    !githubRepo.endsWith('.github.io');
  const base = baseOverride ?? (isGitHubPagesBuild ? `/${githubRepo}/` : '/');

  return {
    base,
    plugins: [
      react(), 
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'My Mercado',
          short_name: 'Mercado',
          description: 'Acompanhe preços e economize com inteligência artificial.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: base,
          scope: base,
          icons: [
             {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            }
          ]
        }
      })
    ].filter(Boolean),
    server: {
      host: true,
      https: false,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
