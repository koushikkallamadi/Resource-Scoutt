import { defineConfig, build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Custom plugin to compile content scripts into self-contained IIFE bundles without ESM imports
function buildContentScriptsPlugin() {
  return {
    name: 'build-content-scripts-plugin',
    async writeBundle() {
      // Build content script as IIFE
      await build({
        configFile: false,
        resolve: {
          alias: { '@': resolve(__dirname, 'src') },
        },
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/index.ts'),
            name: 'ResourceScoutContent',
            formats: ['iife'],
            fileName: () => 'content.js',
          },
          rollupOptions: {
            output: {
              extend: true,
            },
          },
        },
      });

      // Build mainWorld script as IIFE
      await build({
        configFile: false,
        resolve: {
          alias: { '@': resolve(__dirname, 'src') },
        },
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/mainWorld.ts'),
            name: 'ResourceScoutMainWorld',
            formats: ['iife'],
            fileName: () => 'mainWorld.js',
          },
          rollupOptions: {
            output: {
              extend: true,
            },
          },
        },
      });

      // Copy manifest.json & public assets to dist/
      if (!existsSync('dist')) mkdirSync('dist');
      copyFileSync('manifest.json', 'dist/manifest.json');
      if (existsSync('public/default-rubric.json')) {
        copyFileSync('public/default-rubric.json', 'dist/default-rubric.json');
      }
      if (existsSync('public/icons')) {
        if (!existsSync('dist/icons')) mkdirSync('dist/icons', { recursive: true });
        ['16', '32', '48', '128'].forEach((size) => {
          const icon = `public/icons/icon${size}.png`;
          if (existsSync(icon)) {
            copyFileSync(icon, `dist/icons/icon${size}.png`);
          }
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), buildContentScriptsPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
