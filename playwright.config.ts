import { defineConfig, devices } from "@playwright/test";

// Local / full-tier smoke test: starts every producer plus the shell, then drives the
// shell in a browser. Not part of CI. Run with `npm run test:e2e`.
const servers = [
  {
    name: "table",
    command: "npm run dev -w app-table",
    url: "http://localhost:3001/mf-manifest.json",
  },
  {
    name: "counter",
    command: "npm run dev -w app-counter",
    url: "http://localhost:3002/counter-remote-entry.js",
  },
  // app-people-list runs tsc + vite build + preview, so allow it longer to start.
  {
    name: "people",
    command: "npm run dev -w app-people-list",
    url: "http://localhost:3003/mf-manifest.json",
  },
  {
    name: "shell",
    command: "npm run dev -w portal-shell",
    url: "http://localhost:3000/remotes.json",
  },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: servers.map(({ name, command, url }) => ({
    name,
    command,
    url,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  })),
});
