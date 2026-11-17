import { federation } from "@module-federation/vite";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import remotes from "./remotes.json" with { type: "json" };

export default defineConfig({
  plugins: [
    federation({
      name: "shell_ssr",
      remotes: {
        // MF 2 manifests: the runtime reads each remote's entries (and people's SSR
        // entry, metaData.ssrRemoteEntry) from them.
        table: { type: "var", name: "table", entry: remotes.table },
        people: { type: "module", name: "people", entry: remotes.people },
        // Native webpack MF v1 has no manifest: point at its remote entry script.
        counter: { type: "var", name: "counter", entry: remotes.counter },
      },
      // Resolve each remote's shared deps lazily so one unreachable remote can't block the rest.
      shareStrategy: "loaded-first",
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
      // React Router renders the document itself (no index.html), so start the
      // federation runtime from the client entry instead.
      hostInitInjectLocation: "entry",
      dts: false,
    }),
    reactRouter(),
  ],
  server: {
    port: 4000,
    strictPort: true,
  },
});
