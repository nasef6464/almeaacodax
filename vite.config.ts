import path from 'path';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
    const appVersion =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.CF_PAGES_COMMIT_SHA ||
      (() => {
        try {
          return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        } catch {
          return 'local';
        }
      })();

    return {
      define: {
        __APP_VERSION__: JSON.stringify(appVersion),
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['robots.txt'],
          manifest: {
            name: 'ALMEAA CODAX',
            short_name: 'ALMEAA',
            description: 'ALMEAA CODAX platform for Qudrat and Tahsili',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            background_color: '#f9fafb',
            theme_color: '#4f46e5',
            lang: 'ar',
            dir: 'rtl',
            icons: [
              {
                src: '/images/homepage-hero-boy-platform.jpg',
                sizes: '512x512',
                type: 'image/jpeg',
                purpose: 'any',
              },
            ],
          },
          workbox: {
            cleanupOutdatedCaches: true,
            skipWaiting: true,
            clientsClaim: true,
            navigateFallback: '/index.html',
            globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: ({ request }) => request.mode === 'navigate',
                handler: 'NetworkFirst',
                options: {
                  cacheName: `pages-cache-${appVersion}`,
                },
              },
              {
                urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  networkTimeoutSeconds: 3,
                },
              },
            ],
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 900,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) {
                return undefined;
              }

              if (id.includes('react-dom') || id.includes('react-router-dom') || id.includes('\\react\\') || id.includes('/react/')) {
                return 'react-core';
              }

              if (id.includes('katex')) {
                return 'math-rendering';
              }

              if (id.includes('react-quill-new')) {
                return 'editor';
              }

              if (id.includes('recharts')) {
                return 'charts';
              }

              if (id.includes('lucide-react')) {
                return 'icons';
              }

              if (id.includes('motion')) {
                return 'motion';
              }

              if (id.includes('@google/genai')) {
                return 'ai-sdk';
              }

              if (id.includes('xlsx')) {
                return 'spreadsheet';
              }

              return undefined;
            },
          },
        },
      }
    };
});
