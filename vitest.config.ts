import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['packages/*/src/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    passWithNoTests: true
  }
});
