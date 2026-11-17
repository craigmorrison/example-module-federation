import { defineConfig, devices } from "@playwright/test";

// Local-only check of the production SSR shell: `react-router build` + `react-router-serve`
// on :4001, server-rendering the built people remote (`vite build` + `vite preview`).
// People is served on :3005, not its default :3003, and the shell is pointed at it with
// MF_REMOTES, so this also covers the runtime remotes override without a rebuild. Table
// and counter are client-only islands, so their dev servers do. Not part of CI, and
// slower than `test:e2e` because it builds. Run with `npm run test:e2e:ssr-prod`.
export const PEOPLE_PORT = 3005;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /ssr-prod\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4001",
    trace: "retain-on-failure",
  },
  projects: [{ name: "ssr-prod" }],
  // Started in order, so people is built and serving before the shell starts.
  webServer: [
    {
      name: "table",
      command: "npm run dev -w app-table",
      url: "http://localhost:3001/mf-manifest.json",
      reuseExistingServer: !process.env.CI,
    },
    {
      name: "counter",
      command: "npm run dev -w app-counter",
      url: "http://localhost:3002/counter-remote-entry.js",
      reuseExistingServer: !process.env.CI,
    },
    {
      name: "people (built)",
      command: `npm run build -w app-people-list && npm run preview -w app-people-list -- --port ${PEOPLE_PORT} --strictPort`,
      url: `http://localhost:${PEOPLE_PORT}/mf-manifest.json`,
      reuseExistingServer: false,
    },
    {
      name: "shell-ssr (production)",
      command: "npm run build -w portal-shell-ssr && npm start -w portal-shell-ssr",
      url: "http://localhost:4001/",
      reuseExistingServer: false,
      env: {
        PORT: "4001",
        MF_REMOTES: JSON.stringify({ people: `http://localhost:${PEOPLE_PORT}/mf-manifest.json` }),
      },
    },
  ].map((server) => ({
    ...server,
    timeout: 180_000,
    stdout: "ignore" as const,
    stderr: "pipe" as const,
  })),
});
