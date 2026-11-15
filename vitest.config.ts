import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["packages/*/src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    // Playwright specs live in e2e/ and run with `npm run test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx,js,jsx}"],
      exclude: [
        "**/*.{test,spec}.*",
        "**/*.d.ts",
        "e2e/**",
        "**/*.config.*",
        // Entry and bootstrap files: they only mount the app.
        "packages/*/src/index.*",
        "packages/*/src/bootstrap.*",
        "packages/*/src/entry*",
      ],
      reporter: ["text", "html"],
    },
  },
});
