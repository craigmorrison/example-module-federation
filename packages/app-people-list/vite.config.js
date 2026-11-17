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
  // Build the ssr environment too, so `vite build` also emits the SSR remote entry
  // (people-remote-entry.ssr.js) next to the browser one and advertises it in
  // mf-manifest.json as metaData.ssrRemoteEntry, for hosts that render on the server.
  builder: {},
  environments: {
    ssr: {
      build: {
        // Scratch output: the plugin copies the SSR entry and its chunks into dist/ during
        // the build, and nothing reads dist-ssr/ afterwards, so it isn't a turbo output.
        outDir: "dist-ssr",
        // The SSR build needs an entry of its own; the plugin adds the SSR remote entry.
        rolldownOptions: { input: federationConfig.exposes["./People"] },
      },
    },
  },
});
