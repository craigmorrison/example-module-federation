import { defineConfig, devices } from "@playwright/test";

// Local / full-tier smoke test: starts every producer plus both shells (Rspack on :3000,
// React Router SSR on :4000), then drives them in a browser. Not part of CI. Run with
// `npm run test:e2e`.
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
  // app-people-list runs Vite's dev server; its manifest is served at the same URL as a build's.
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
  {
    name: "shell-ssr",
    command: "npm run dev -w portal-shell-ssr",
    url: "http://localhost:4000/",
  },
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /ssr\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "ssr",
      testMatch: /ssr\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4000" },
    },
  ],
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
