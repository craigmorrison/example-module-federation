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
      manifest: false
    })
  ],
  server: {
    port: 3003,
    cors: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
