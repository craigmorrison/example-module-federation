# Bundler Comparison for Module Federation

A practical comparison of Webpack, Rspack and Vite as Module Federation producers (and Vite as an SSR consumer), based on what this repo runs.

Each claim is marked as one of:

- **Verified here**: exercised in this repo, by the e2e suite or by hand, with the versions below.
- **Per plugin docs**: taken from the `@module-federation/vite` README (installed at `node_modules/@module-federation/vite/README.md`) and not exercised here.

Versions checked: Vite 8.3.8 (Rolldown 1.2.19, Oxc), `@module-federation/vite` 1.24.0, `@vitejs/plugin-react` 6.3.0, `@module-federation/enhanced` and `@module-federation/runtime` 2.9.3, React Router 8.5.1, React 19.3.1, Node 24.

## Summary

|                          | Webpack (counter)            | Rspack (table)          | Vite 8 (people)                                     |
| ------------------------ | ---------------------------- | ----------------------- | --------------------------------------------------- |
| **MF version**           | v1 (native) or v2 (enhanced) | v2 (enhanced)           | v2 (`@module-federation/vite`)                      |
| **Dev server as remote** | webpack-dev-server           | @rspack/dev-server      | `vite` dev server, for any consumer (verified here) |
| **Transpiler**           | swc-loader                   | builtin:swc-loader      | Oxc (built into Vite 8)                             |
| **Bundler**              | webpack                      | Rspack                  | Rolldown                                            |
| **Remote entry**         | Classic script (global)      | Classic script (global) | ES module, advertised as `"type": "module"`         |
| **Manifest**             | None on v1                   | `mf-manifest.json`      | `mf-manifest.json`                                  |
| **SSR remote entry**     | None                         | None                    | `people-remote-entry.ssr.js`, in dev and build      |

## Vite workarounds: what changed

This repo used to carry two Vite workarounds. Both are gone; one small shim remains.

### 1. The producer no longer needs build + preview in dev (removed)

**Before:** `app-people-list`'s `dev` script was `tsc && vite build && vite preview`, because the Vite dev server could not serve a remote to the Rspack shell. The shell failed with `@vitejs/plugin-react can't detect preamble. Something is wrong.`

**Now (verified here):** `dev` is plain `vite`. The dev server serves `mf-manifest.json` at the same URL as a build (`http://localhost:3003/mf-manifest.json`), with the remote entry as an ES module and an SSR entry under `/__mf_ssr__/`, so `remotes.json` did not change. The Rspack shell loads the people page from it, and the e2e suite runs against it.

That preamble error was never a module-format problem: the MF runtime loads the entry with `import()` because the manifest says `"type": "module"`. In dev, every component module that `@vitejs/plugin-react` transforms checks that its Fast Refresh preamble ran on the page (`window.$RefreshReg$`) and throws if it didn't. Vite pages run the preamble from `index.html`; the Rspack shell doesn't.

**The shim that remains:** the exposed module imports `src/components/people/refresh-preamble.ts` first, which defines the two globals that check reads when they're missing. It only runs in dev (`import.meta.hot`) and in a browser, so it is dropped from builds and is safe when the SSR shell loads the remote's dev SSR entry. Importing `@vitejs/plugin-react/preamble` instead fixed the Rspack shell, but it broke SSR: in dev the SSR shell failed with `ReferenceError: window is not defined at /@react-refresh:625:1`.

**React stays a single instance (verified here):** in the Rspack shell's share scope, `react` and `react-dom` resolve `from shell` for both the shell and people, and React Query's hooks and Emotion work in the remote. With a second React, the hooks would throw. One dev-only quirk: the remote evaluates its own `react-dom/client` fallback (the shell doesn't share that subpath), so the React DevTools banner prints twice in dev. Rendering still goes through the shell's `react-dom`. A production build prints it once.

**HMR:**

- Standalone (`http://localhost:3003/`): Fast Refresh works. An edit updates the page without a reload (verified here).
- Inside the Rspack shell: Vite applies the update, but nothing re-renders, because the refresh runtime isn't hooked into the shell's `react-dom`. Reload the page. Per plugin docs, `dev.remoteHmr` gives cross-federation React Fast Refresh when the host is a Vite app too; that isn't the case here.

Fixing this turned up an older bug: the standalone people page was blank in dev and in preview. Its entry rendered on `DOMContentLoaded`, which had already fired by the time the federation runtime's top-level await let the module run. It now renders straight away.

### 2. The SSR shell no longer hand-rolls the runtime (removed)

**Before:** `portal-shell-ssr` stayed out of Vite's pipeline. It called `init()` from `@module-federation/runtime` itself, passed React in as `shared` `lib` factories, and loaded every remote client-side after mount, so the server only rendered a placeholder.

**Now (verified here):** `vite.config.ts` has `federation()` from `@module-federation/vite` next to `reactRouter()`, and the two plugins coexist. The plugin registers the remotes (people and table through `mf-manifest.json`, counter through its remote entry) and shares React and ReactDOM as singletons. `app/federation.client.ts` is gone.

- **People is server-rendered.** `app-people-list` advertises `metaData.ssrRemoteEntry` in its manifest, and on the server the plugin loads that entry (per plugin docs, through Vite's ModuleRunner in `react-router dev` and through its SSR entry loader in a production build; both verified to work here). View source for `/people` shows the remote's own markup: its Emotion `<style>` and its loading state. A browser gets the shell first and the remote streamed into the same response; crawlers get it inline, since `entry.server.tsx` waits for every boundary for bots. React Query doesn't fetch during a server render, so the server HTML shows `LOADING` and the list fills in after hydration. Hydration logs no errors.
- **Table and counter stay client-only islands.** They publish no SSR entry, so their routes render a placeholder on the server and load in the browser after hydration (`<FederatedRemote ssr={false}>`, the default).
- **Failures stay local.** Asked to server-render a remote with no SSR entry, the plugin fails with `Failed to load Node.js entry for remote ... Automatic publicPath is not supported in this browser`. With people down, it's `Failed to get manifest. #RUNTIME-003`. Either way only that remote's Suspense boundary falls back to client rendering, and the page still returns 200. A running server picks the remote up again once it's back.
- **Production works:** `react-router build` and `react-router-serve` (on :4001, since `npm start` needed `@react-router/serve`, which was missing), against `vite preview` of the built people remote, return server-rendered people and hydrate without errors.

Remote URLs now come from `packages/portal-shell-ssr/remotes.json` at build time, not from a `/remotes.json` fetched at runtime. Per plugin docs, a remote registered at runtime with `registerRemotes()` under a configured name replaces it for `loadRemote()` calls, if per-environment URLs without a rebuild are needed again.

To emit the SSR entry from `vite build`, `app-people-list`'s Vite config builds every environment (`builder: {}`) and gives the `ssr` environment the exposed module as its input. The plugin copies `people-remote-entry.ssr.js` into `dist/` and adds it to the manifest. The dev server advertises an SSR entry without any configuration.

## What stays the same

- **Counter stays on native webpack MF v1** on purpose. Both shells load it from its plain remote entry next to MF 2 producers, which shows a migration can go one app at a time and needs no flag day.
- **Rolldown's native Module Federation is still not published.** Rolldown 1.2.19, as installed, exports no Module Federation plugin, so `@module-federation/vite` is still the way to federate a Vite app. Now that the plugin covers dev serving and SSR, that matters less than it did.
- **Run the production build before relying on behaviour.** Shared-module handling in dev is a different code path from the build (see the extra `react-dom/client` above). The e2e suite runs against dev servers, and the production SSR check above was done by hand.

## Rspack: the easy migration from webpack

Rspack configs are nearly identical to webpack's. The main differences:

```js
// Webpack
const { ModuleFederationPlugin } = require("@module-federation/enhanced/webpack");
loader: "swc-loader";

// Rspack
const { ModuleFederationPlugin } = require("@module-federation/enhanced/rspack");
loader: "builtin:swc-loader";
```

Everything else (devServer config, shared module config, federation config) is the same, and builds are much faster. Rspack's remote entries load the same way as webpack's, from any consumer.

## Webpack: the safe default

Native webpack Module Federation (v1) is the most battle-tested option. The `@module-federation/enhanced` plugin (v2) adds the runtime SDK, manifests and type hints while staying backward-compatible. Webpack producers work with every consumer in dev and production. When migrating an existing MFE estate, keeping producers on webpack until the consumer upgrade is validated is the lowest-risk approach.

## Consumer bundler choice

The consumer (shell) has stricter requirements than producers, because it owns the shared scope.

| Consumer bundler                           | v1 producers                                | v2 producers                                       | SSR support                                                                            |
| ------------------------------------------ | ------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **webpack** (native MF v1)                 | Full compat                                 | Can load `remoteEntry.js` but no manifest features | Custom Express SSR with `@module-federation/node`                                      |
| **rspack** (native v1.5)                   | Full compat (same protocol as webpack)      | Can load `remoteEntry.js` but no manifest features | Custom SSR possible                                                                    |
| **rspack** (`@module-federation/enhanced`) | Works through the plain remote entry (here) | Full compat                                        | Custom SSR possible                                                                    |
| **vite** (`@module-federation/vite`)       | Works through the plain remote entry (here) | Works (here)                                       | React Router 8 framework mode: server-renders remotes that publish an SSR entry (here) |
| **Next.js** (webpack mode)                 | Via `@module-federation/nextjs-mf`          | Via `@module-federation/nextjs-mf`                 | Built-in SSR                                                                           |
| **Next.js** (Turbopack)                    | **No MF support**                           | **No MF support**                                  | N/A                                                                                    |

**Consumers used here:** `portal-shell` is Rspack with `@module-federation/enhanced`, registering remotes at runtime (`registerRemotes`). `portal-shell-ssr` is React Router 8 on Vite with `@module-federation/vite`. Both load the v1 counter alongside the MF 2 producers.

## Recommendation for migration

1. **Start with webpack everywhere** (where most organisations are today).
2. **Move the consumer to Rspack**, with native v1.5 or `@module-federation/enhanced`. Same MF protocol, much faster builds, no producer changes.
3. **Move producers to Rspack**, one at a time: minimal config changes.
4. **Upgrade the consumer and producers to MF v2** (`@module-federation/enhanced`) to get manifests, type hints and devtools. As counter shows, v1 producers can stay as they are meanwhile.
5. **Vite producers are a real option now.** With Vite 8 and `@module-federation/vite` 1.24, a Vite producer runs from its dev server for any consumer and publishes an SSR entry. Budget for the small preamble shim when the consumer isn't Vite, and for an extra SSR environment in the build.
6. **SSR:** a Vite consumer (React Router 8 framework mode) with `@module-federation/vite` server-renders remotes that publish an SSR entry and keeps the rest as client islands, as `portal-shell-ssr` does. Next.js (webpack mode) with `@module-federation/nextjs-mf` remains the alternative for webpack-built remotes.
