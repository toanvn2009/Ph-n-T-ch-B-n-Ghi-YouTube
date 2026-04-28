import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/v1': {
          target: 'http://localhost:20128',
          changeOrigin: true,
          secure: false,
          configure: (proxy: any) => {
            proxy.on('proxyRes', (proxyRes: any) => {
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['x-accel-buffering'] = 'no';
              delete proxyRes.headers['content-encoding'];
            });
          },
        },
        '/api/tts': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), tailwindcss()],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'gemini': ['@google/genai'],
            'openai-router': ['openai'],
          },
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || 'sk_9router'),
      'process.env.OPENAI_BASE_URL': JSON.stringify(env.OPENAI_BASE_URL || '/v1'),
      'process.env.OPENAI_MODEL': JSON.stringify(env.OPENAI_MODEL || 'combo-tw4'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
