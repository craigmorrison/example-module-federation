import * as React from "react";
import * as ReactDOM from "react-dom";
import { init } from "@module-federation/runtime";

/**
 * Resolves once the Module Federation runtime knows about the remotes listed in
 * /remotes.json (served from public/, so it can be swapped per environment). The
 * runtime is used directly, without a build plugin, to stay out of React Router's
 * Vite pipeline, so React is handed over explicitly instead of through the bundler's
 * share scope.
 */
export const remotesReady: Promise<void> = (async () => {
  const response = await fetch("/remotes.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load remotes config (HTTP ${response.status})`);
  }
  const remotes: Record<string, string> = await response.json();

  init({
    name: "shell-ssr",
    remotes: Object.entries(remotes).map(([name, entry]) => ({ name, entry })),
    // Resolve each remote's shared deps lazily so one unreachable remote can't block the rest.
    shareStrategy: "loaded-first",
    shared: {
      react: {
        version: React.version,
        scope: "default",
        lib: () => React,
        shareConfig: { singleton: true, requiredVersion: `^${React.version}` },
      },
      "react-dom": {
        version: ReactDOM.version,
        scope: "default",
        lib: () => ReactDOM,
        shareConfig: { singleton: true, requiredVersion: `^${ReactDOM.version}` },
      },
    },
  });
})();
