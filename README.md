# Cross-Bundler Module Federation

A proof of concept showing Module Federation working across **Webpack**, **Rspack**, and **Vite 8** — and how to incrementally migrate from MF v1 to v2 without breaking existing micro-frontends.

## Architecture

```
                         ┌──────────────────┐
                         │   portal-shell   │
                         │   MF v2 (host)   │
                         │ webpack/rspack/  │
                         │      vite        │
                         │   :3000          │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                    │
              ▼                   ▼                    ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
   │   app-counter   │ │    app-table    │ │  app-people-list │
   │    MF v1        │ │    MF v1        │ │    MF v2         │
   │  webpack only   │ │  webpack only   │ │ webpack/rspack/  │
   │   (legacy)      │ │   (legacy)      │ │      vite        │
   │   :3002         │ │   :3001         │ │   :3003          │
   └─────────────────┘ └─────────────────┘ └──────────────────┘
```

This models a realistic migration where:

1. **Shell upgrades first** — the v2 host (`@module-federation/enhanced`) can consume both v1 and v2 remotes
2. **Legacy remotes stay on v1** — `app-counter` and `app-table` still use native `webpack.container.ModuleFederationPlugin`, webpack-only
3. **Migrated remotes get multi-bundler support** — `app-people-list` is on v2, buildable with webpack, rspack, or vite

## Stack

| Tool | Purpose |
|---|---|
| [Module Federation v2](https://module-federation.io/) | Micro-frontend runtime (cross-bundler) |
| [Webpack 5](https://webpack.js.org/) | Bundler (v1 + v2 remotes) |
| [Rspack](https://rspack.rs/) | Bundler (v2 packages only) |
| [Vite 8](https://vite.dev/) | Bundler with Rolldown (v2 packages only) |
| [SWC](https://swc.rs/) | Transpiler (replaces Babel) |
| [React 19](https://react.dev/) | UI framework |
| [Turborepo](https://turbo.build/) | Monorepo task runner |
| [Vitest](https://vitest.dev/) | Test runner |
| [oxlint](https://oxc.rs/) + [oxfmt](https://oxc.rs/) | Linter + formatter |

## Requirements

- Node.js (see `.nvmrc` — currently v24)
- npm

## Getting started

```shell
npm install
```

## Running

```shell
# All 4 apps via webpack (the only mode that runs everything, since counter
# and table are v1 webpack-only)
npm run dev
```

Then open **http://localhost:3000** and navigate to `/table`, `/counter`, `/people`.

### Mix bundlers

Since counter and table are v1 (webpack-only), they always run on webpack. But you can run the v2 shell and people-list on any bundler:

```shell
# Legacy remotes on webpack, shell on rspack, people-list on vite
npm run dev -w app-counter &
npm run dev -w app-table &
npm run dev:rspack -w portal-shell &
npm run dev:vite -w app-people-list &
```

This demonstrates the real migration scenario — a v2 rspack host consuming v1 webpack remotes and a v2 vite remote simultaneously.

## Building

```shell
npm run build:webpack    # All 4 packages
npm run build:rspack     # v2 packages only (shell + people-list)
npm run build:vite       # v2 packages only (shell + people-list)
```

## Testing & linting

```shell
npm test                 # Vitest
npx oxlint .             # Lint
```

## How federation works across bundlers

Each v2 package has a `federation.config.js` with the bundler-agnostic MF config (name, exposes, remotes, shared deps). This is consumed by the webpack, rspack, and vite configs for that package.

The v2 runtime from `@module-federation/enhanced` negotiates shared dependencies (React, react-dom) regardless of which bundler produced each remote entry. Ports are fixed per-app, so the shell always fetches remotes from the same URLs — it doesn't matter which bundler is serving them.

v1 remotes (counter, table) produce standard `remoteEntry.js` files that the v2 host understands natively — no bridge or adapter needed.

## Migration challenges: shared modules

Shared module configuration is the hardest part of an MF v1 → v2 migration, especially when you have a mix of v1 and v2 remotes running simultaneously. Here's what we hit and how we solved it.

### `eager: true` must match across v1 and v2

The `eager` flag changes how webpack bundles the shared module — it's a **build-time** decision baked into the chunk graph, not a runtime negotiation. If the host sets `eager: true` for React but a remote doesn't (or vice versa), you can get:

- **Duplicate React instances** — hooks break, context doesn't propagate, `useState` throws "Invalid hook call"
- **Load-order failures** — the eager copy loads synchronously but the non-eager copy hasn't resolved yet

In this repo, every package sets `eager: true` + `singleton: true` for React and react-dom. **Keep this consistent across all v1 and v2 packages.**

### v1 and v2 shared scopes are separate runtimes

MF v1 (native webpack) manages shared modules through webpack's internal `__webpack_share_scopes__`. MF v2 (`@module-federation/enhanced`) has its own runtime SDK that decouples from webpack's bootstrap.

In practice, this means:
- A v2 host initialises its own shared scope, then loads v1 remote entries
- The v1 remote entry calls `__webpack_init_sharing__('default')` which hooks into the same shared scope
- **This works** because `@module-federation/enhanced` patches the webpack shared scope APIs for backward compatibility
- But it **only works when the v2 side is the host** — a v1 host cannot initialise the v2 runtime

### `singleton: true` without `requiredVersion` is dangerous

If you mark a dependency as `singleton: true` without `requiredVersion`, the first version to load wins — even if it's incompatible. In a mixed v1/v2 environment where packages may resolve different versions:

```js
// Bad — any version wins
shared: { react: { singleton: true } }

// Good — version mismatch produces a warning, falls back to own copy
shared: { react: { singleton: true, requiredVersion: deps.react } }
```

### `@tanstack/react-query` (or any non-trivial shared dep)

In this repo, only `app-people-list` uses `@tanstack/react-query`. It's shared with `singleton: true` but **not** `eager: true`:

```js
'@tanstack/react-query': { singleton: true, requiredVersion: deps['@tanstack/react-query'] }
```

This works because react-query doesn't need to be available synchronously at bootstrap. But if you add it to the shell's shared config too (e.g. because the shell starts using it), you need to decide:
- **Both sides `eager`?** Increases bundle size but avoids async loading races
- **Both sides non-eager?** Requires the async bootstrap pattern (`app.js` → `import('./bootstrap')`) in both packages

The async bootstrap pattern (which all packages in this repo use) exists specifically to give non-eager shared modules time to resolve before the app renders.

### Cross-bundler shared module gotchas

When mixing bundlers (e.g. shell on rspack, remote on vite):

- **Version strings must be semver** — the MF runtime compares versions to decide which shared copy wins. Non-semver strings (git hashes, `"latest"`) break negotiation silently
- **`eager` has no meaning in Vite** — Vite's dev server uses native ESM, so there's no webpack chunk graph. `@module-federation/vite` handles shared modules differently at dev time vs build time. Your shared config is honoured in production builds but may behave differently during `vite dev`
- **Singleton enforcement is runtime-only** — if a remote bundles its own copy of React (because the shared scope negotiation failed), you'll get two React instances with no build-time warning. Watch the browser console for `Unsatisfied version` warnings from the MF runtime

### The bootstrap pattern is non-negotiable

Every MFE entry point in this repo follows the pattern:

```js
// app.js (entry)
import('./bootstrap');

// bootstrap.jsx (async boundary)
import { createRoot } from 'react-dom/client';
createRoot(...).render(...);
```

This dynamic import creates an **async boundary** that lets webpack/rspack resolve shared modules before the app code runs. Without it, `eager: false` shared modules will be `undefined` at import time. Vite handles this internally via the federation plugin, but the pattern is still needed for webpack/rspack compatibility.

## Links

- [Module Federation](https://module-federation.io/)
- [@module-federation/enhanced](https://www.npmjs.com/package/@module-federation/enhanced)
- [Rspack Module Federation](https://rspack.rs/guide/features/module-federation)
- [Vite Module Federation](https://www.npmjs.com/package/@module-federation/vite)
