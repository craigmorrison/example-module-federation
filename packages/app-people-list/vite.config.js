import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';

const federationConfig = require('./federation.config.js');

export default defineConfig({
  plugins: [
    react({ jsxImportSource: '@emotion/react' }),
    federation({
      ...federationConfig,
      remotes: {},
      manifest: true
    })
  ],
  server: {
    port: 3003,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:3003'
  },
  preview: {
    port: 3003,
    strictPort: true,
    cors: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
