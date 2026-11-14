import { defineConfig } from "vite";
import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import federationConfig from "./federation.config.js";

// Leave PUBLIC_URL unset and the remote resolves its assets relative to wherever its
// remote entry was loaded from (publicPath "auto"), so one build works in any
// environment. Set it (e.g. https://cdn.example.com/people/) to pin an absolute URL.
const publicUrl = process.env.PUBLIC_URL ?? "";

export default defineConfig({
  plugins: [
    react({ jsxImportSource: "@emotion/react" }),
    federation({
      ...federationConfig,
      remotes: {},
      manifest: true,
    }),
  ],
  server: {
    port: 3003,
    strictPort: true,
    cors: true,
    origin: publicUrl || "http://localhost:3003",
  },
  preview: {
    port: 3003,
    strictPort: true,
    cors: true,
  },
  base: publicUrl,
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
