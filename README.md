# Cross-Bundler Module Federation

A proof of concept showing Module Federation working across **Webpack**, **Rspack**, and **Vite 8** — and how to incrementally migrate from MF v1 to v2 without breaking existing micro-frontends.

## Architecture

```
                         ┌──────────────────┐
                         │   portal-shell   │
                         │  MF v2 consumer  │
                         │   webpack only   │
                         │   :3000          │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                    │
              ▼                   ▼                    ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
   │   app-counter   │ │    app-table    │ │  app-people-list │
   │  MF v1 producer │ │ MF v1 producer  │ │  MF v2 producer  │
   │  webpack only   │ │  webpack only   │ │ webpack/rspack/  │
   │   (legacy)      │ │   (legacy)      │ │      vite        │
   │   :3002         │ │   :3001         │ │   :3003          │
   └─────────────────┘ └─────────────────┘ └──────────────────┘

              ┌──────────────────┐
              │ portal-shell-ssr │  (alternative consumer)
              │  MF v2 consumer  │
              │  SSR via RR7     │
              │  :3004           │
              └──────────────────┘
```

This models a realistic migration where:

1. **Consumer upgrades first** — the v2 consumer (`@module-federation/enhanced`) can consume both v1 and v2 producers
2. **Legacy producers stay on v1** — `app-counter` and `app-table` still use native `webpack.container.ModuleFederationPlugin`, webpack-only
3. **Migrated producers get multi-bundler support** — `app-people-list` is on v2, buildable with webpack, rspack, or vite
4. **SSR consumer available** — `portal-shell-ssr` is an alternative consumer using React Router 7 framework mode with server-side rendering

## Stack

| Tool | Purpose |
|---|---|
| [Module Federation v2](https://module-federation.io/) | Micro-frontend runtime (cross-bundler) |
| [Webpack 5](https://webpack.js.org/) | Bundler (consumer + all producers) |
| [Rspack](https://rspack.rs/) | Bundler (v2 producers only) |
| [Vite 8](https://vite.dev/) | Bundler with Rolldown (v2 producers only) |
| [SWC](https://swc.rs/) | Transpiler (replaces Babel) |
| [React 19](https://react.dev/) | UI framework |
| [React Router 7](https://reactrouter.com/) | Routing (SSR consumer uses framework mode) |
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
npm run dev           # SPA consumer (:3000) + all producers
npm run dev:ssr       # SSR consumer (:3004) + all producers
```

Then open **http://localhost:3000** (SPA) or **http://localhost:3004** (SSR) and navigate to `/table`, `/counter`, `/people`.

### Mix bundlers on producers

The consumer stays on webpack. Producers can be switched to different bundlers:

```shell
npm run dev:rspack    # Consumer on webpack, v2 producers on rspack
npm run dev:vite      # Consumer on webpack, v2 producers on vite
```

Legacy v1 producers (counter, table) always run on webpack — they haven't been migrated yet.

## Building

```shell
npm run build:webpack    # All packages
npm run build:rspack     # v2 producers only (people-list)
npm run build:vite       # v2 producers only (people-list)
```

## Testing & linting

```shell
npm test                 # Vitest
npx oxlint .             # Lint
```

## How federation works across bundlers

Each v2 producer has a `federation.config.js` with the bundler-agnostic MF config (name, exposes, shared deps). This is consumed by the webpack, rspack, and vite configs for that package.

The consumer doesn't need multiple bundler configs — it just fetches `remoteEntry.js` files over HTTP. It doesn't care how they were built. The v2 runtime from `@module-federation/enhanced` negotiates shared dependencies (React, react-dom) regardless of which bundler produced each remote entry.

v1 producers (counter, table) produce standard `remoteEntry.js` files that the v2 consumer understands natively — no bridge or adapter needed.

### SSR consumer

The SSR consumer (`portal-shell-ssr`) uses React Router 7 in framework mode. The shell chrome (nav, header, layout) is server-rendered for fast first paint. Federated producers load as client-only islands — the server renders a loading placeholder, then the MF runtime loads the producer's component after hydration.

This uses `@module-federation/runtime` directly (not a build plugin) to avoid conflicts with React Router 7's Vite plugin.

## Migration challenges: shared modules

Shared module configuration is the hardest part of an MF v1 → v2 migration, especially when you have a mix of v1 and v2 producers running simultaneously. See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for the full guide.

Key points:

- **`eager: true` must match** across v1 and v2 — mismatch causes duplicate React instances
- **v1 and v2 shared scopes are separate runtimes** — works because v2 patches webpack's sharing APIs, but only when v2 is the consumer
- **`singleton: true` without `requiredVersion`** — first version wins silently, even if incompatible
- **The async bootstrap pattern is non-negotiable** for webpack/rspack producers

## Links

- [Module Federation](https://module-federation.io/)
- [@module-federation/enhanced](https://www.npmjs.com/package/@module-federation/enhanced)
- [Rspack Module Federation](https://rspack.rs/guide/features/module-federation)
- [Vite Module Federation](https://www.npmjs.com/package/@module-federation/vite)
