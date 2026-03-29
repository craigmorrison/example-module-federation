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

## Links

- [Module Federation](https://module-federation.io/)
- [@module-federation/enhanced](https://www.npmjs.com/package/@module-federation/enhanced)
- [Rspack Module Federation](https://rspack.rs/guide/features/module-federation)
- [Vite Module Federation](https://www.npmjs.com/package/@module-federation/vite)
