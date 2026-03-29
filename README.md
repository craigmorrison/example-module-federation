# Cross-Bundler Module Federation

A proof of concept showing Module Federation working across **Webpack**, **Rspack**, and **Vite 8** — with each producer on a different bundler and the consumer not caring how they were built.

## Architecture

```
                         ┌──────────────────┐
                         │   portal-shell   │
                         │ MF v1.5 consumer │
                         │     rspack       │
                         │   :3000          │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                    │
              ▼                   ▼                    ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
   │   app-counter   │ │    app-table    │ │  app-people-list │
   │  MF v1 producer │ │ MF v2 producer  │ │  MF v2 producer  │
   │     webpack     │ │     rspack      │ │      vite        │
   │   (legacy)      │ │  (migrated)     │ │   (migrated)     │
   │   :3002         │ │   :3001         │ │   :3003          │
   └─────────────────┘ └─────────────────┘ └──────────────────┘

              ┌──────────────────┐
              ┌──────────────────┐
              │ portal-shell-ssr │  (experimental — MFE loading
              │  MF v2 consumer  │   broken in dev, see docs)
              │  SSR via RR7     │
              │  :4000           │
              └──────────────────┘
```

Three producers, three different bundlers, one consumer that fetches `remoteEntry.js` over HTTP regardless of how it was built. This demonstrates:

1. **Cross-bundler federation** — webpack, rspack, and vite producers all consumed by an rspack consumer using native MF v1.5
2. **v1/v2 coexistence** — `app-counter` is still on native webpack MF v1, the consumer handles both v1 and v2 producers
3. **SSR prototype** — `portal-shell-ssr` demonstrates the architecture (SSR shell chrome + client-only MFE islands) but MFE loading is broken in dev due to Vite's lack of `__webpack_share_scopes__` support

## Stack

| Tool | Purpose |
|---|---|
| [Module Federation v2](https://module-federation.io/) | Micro-frontend runtime (cross-bundler) |
| [Rspack](https://rspack.rs/) | Consumer bundler + producer (app-table) |
| [Webpack 5](https://webpack.js.org/) | Legacy producer bundler (app-counter) |
| [Vite 8](https://vite.dev/) | Producer bundler (app-people-list) + SSR consumer |
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
npm run dev:ssr       # SSR consumer (:4000) + all producers (experimental)
```

`dev` starts:

- **http://localhost:3000** — SPA consumer (rspack, MF v1.5)
- `:3001` — app-table (rspack producer)
- `:3002` — app-counter (webpack producer)
- `:3003` — app-people-list (vite producer, build+preview)

Navigate to `/table`, `/counter`, `/people`.

## Building

```shell
npm run build         # All packages (each uses its own bundler)
```

## Testing & linting

```shell
npm test                 # Vitest
npx oxlint .             # Lint
```

## How federation works across bundlers

Each v2 producer has a `federation.config.js` with the bundler-agnostic MF config (name, exposes, shared deps). The consumer just fetches `remoteEntry.js` files over HTTP — it doesn't care which bundler produced them.

The v2 runtime from `@module-federation/enhanced` negotiates shared dependencies (React, react-dom) regardless of bundler. The v1 producer (counter) produces a standard `remoteEntry.js` that the v2 consumer understands natively.

### SSR consumer

The SSR consumer (`portal-shell-ssr`) uses React Router 7 in framework mode. The shell chrome (nav, header, layout) is server-rendered for fast first paint. Federated producers load as client-only islands — the server renders a loading placeholder, then the MF runtime loads the producer's component after hydration.

This uses `@module-federation/runtime` directly (not a build plugin) to avoid conflicts with React Router 7's Vite plugin.

## Migration challenges: shared modules

See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for the full guide covering shared module configs, migration paths, and cross-bundler interop.

## Links

- [Module Federation](https://module-federation.io/)
- [@module-federation/enhanced](https://www.npmjs.com/package/@module-federation/enhanced)
- [Rspack Module Federation](https://rspack.rs/guide/features/module-federation)
- [Vite Module Federation](https://www.npmjs.com/package/@module-federation/vite)
