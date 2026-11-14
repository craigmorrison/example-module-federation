# Cross-Bundler Module Federation

A proof of concept showing Module Federation working across **Webpack**, **Rspack**, and **Vite 8** — with each producer on a different bundler and the consumer not caring how they were built.

## Architecture

```
                         ┌──────────────────┐
                         │   portal-shell   │
                         │  MF 2 consumer   │
                         │  rspack (enhanced)│
                         │   :3000          │
                         └────────┬─────────┘
                                  │  remotes from /remotes.json
              ┌───────────────────┼───────────────────┐
              │                   │                    │
              ▼                   ▼                    ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
   │   app-counter   │ │    app-table    │ │  app-people-list │
   │  MF v1 producer │ │ MF 2 producer   │ │  MF 2 producer   │
   │     webpack     │ │     rspack      │ │      vite        │
   │ remoteEntry JS  │ │ mf-manifest.json│ │ mf-manifest.json │
   │   :3002         │ │   :3001         │ │   :3003          │
   └─────────────────┘ └─────────────────┘ └──────────────────┘

              ┌──────────────────┐
              │ portal-shell-ssr │  (experimental SSR shell,
              │  MF 2 runtime    │   remotes load as client islands)
              │  SSR via RR7     │
              │  :4000           │
              └──────────────────┘
```

Three producers, three different bundlers, one consumer that loads them at runtime regardless of how they were built. This demonstrates:

1. **Cross-bundler federation**: webpack, rspack and vite producers all consumed by an rspack consumer on `@module-federation/enhanced` (MF 2)
2. **v1/v2 coexistence**: `app-counter` is deliberately still on native webpack MF v1 and has no manifest, so the shell loads it from its plain remote entry. The MF 2 producers are loaded from `mf-manifest.json`
3. **Runtime configuration**: no remote URL is baked into the shell build, see [Remotes config](#remotes-config)
4. **Failure isolation**: each remote route has its own error boundary, so a remote that is down shows a retryable fallback instead of taking the shell down
5. **SSR prototype**: `portal-shell-ssr` server-renders the shell chrome and loads the remotes client-side. Remote loading works in `react-router dev` (see [SSR consumer](#ssr-consumer))

## Stack

| Tool                                                  | Purpose                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| [Module Federation v2](https://module-federation.io/) | Micro-frontend runtime (cross-bundler)            |
| [Rspack](https://rspack.rs/)                          | Consumer bundler + producer (app-table)           |
| [Webpack 5](https://webpack.js.org/)                  | Legacy producer bundler (app-counter)             |
| [Vite 8](https://vite.dev/)                           | Producer bundler (app-people-list) + SSR consumer |
| [SWC](https://swc.rs/)                                | Transpiler (replaces Babel)                       |
| [React 19](https://react.dev/)                        | UI framework                                      |
| [React Router 7](https://reactrouter.com/)            | Routing (SSR consumer uses framework mode)        |
| [Turborepo](https://turbo.build/)                     | Monorepo task runner                              |
| [Vitest](https://vitest.dev/)                         | Test runner                                       |
| [oxlint](https://oxc.rs/) + [oxfmt](https://oxc.rs/)  | Linter + formatter                                |

## Requirements

- Node.js (see `.nvmrc` — currently v24)
- npm

## Getting started

```shell
npm install
npx playwright install chromium   # only needed for the e2e test
```

## Running

```shell
npm run dev           # SPA consumer (:3000) + all producers
npm run dev:ssr       # SSR consumer (:4000) + all producers (experimental)
```

`dev` starts:

- **http://localhost:3000**: SPA consumer (rspack, MF 2)
- `:3001`: app-table (rspack producer, `mf-manifest.json`)
- `:3002`: app-counter (webpack producer, MF v1 remote entry)
- `:3003`: app-people-list (vite producer, build + preview, `mf-manifest.json`)

Navigate to `/table`, `/counter`, `/people`.

## Remotes config

The shell build contains no remote URLs. On start, `src/bootstrap.jsx` fetches `/remotes.json` (source: `packages/portal-shell/static/remotes.json`, copied into the build output), registers the entries with `registerRemotes` from `@module-federation/enhanced/runtime`, then renders. Components are loaded with `loadRemote("table/Table")`.

```json
{
  "table": "http://localhost:3001/mf-manifest.json",
  "counter": "http://localhost:3002/counter-remote-entry.js",
  "people": "http://localhost:3003/mf-manifest.json"
}
```

An entry ending in `.json` is an MF 2 manifest. Anything else is treated as a plain remote entry script, which is what the native v1 counter needs.

To point at another environment, build the shell once and serve a different `remotes.json` next to it (replace the file in `packages/portal-shell/dist/`, or have your host/CDN serve one per environment). The SSR shell reads `packages/portal-shell-ssr/public/remotes.json` the same way.

Producers use `publicPath: "auto"`, so their assets resolve relative to wherever their entry was loaded from. `app-people-list` builds with a relative Vite `base` for that reason. Set `PUBLIC_URL` when building it (for example `PUBLIC_URL=https://cdn.example.com/people/ npm run build -w app-people-list`) to pin an absolute URL instead.

## Building

```shell
npm run build         # All packages (each uses its own bundler, in production mode)
```

## Testing & linting

```shell
npm test                 # Vitest (unit tests)
npm run test:e2e         # Playwright smoke test (starts all dev servers; local only, not in CI)
npm run lint             # Lint (oxlint)
npm run format:check     # Format check (oxfmt)
npm run format           # Format all files (oxfmt)
```

The e2e test visits `/table`, `/counter` and `/people` and checks each remote renders (the people remote's SWAPI call is served from a fixture), and checks that the shell keeps working and shows a fallback with a Retry button when one remote is unreachable. It needs ports 3000 to 3003 free (or already serving the dev servers) and a one-off `npx playwright install chromium`.

## How federation works across bundlers

Each v2 producer has a `federation.config.js` with the bundler-agnostic MF config (name, exposes, shared deps). The consumer doesn't care which bundler produced a remote: it loads an `mf-manifest.json` (MF 2 producers) or a remote entry script (the v1 producer) over HTTP.

The v2 runtime from `@module-federation/enhanced` negotiates shared dependencies (React, react-dom) regardless of bundler. Shared React is `singleton` with a `requiredVersion` and is not `eager`, so producers don't bundle their own copy. The shell and app-table use `experiments: { asyncStartup: true }` instead of the `app.js` -> `import('./bootstrap')` indirection. `app-counter` is native webpack v1 and keeps the bootstrap pattern.

The shell uses `shareStrategy: "loaded-first"`. The default (`version-first`) loads every remote's entry before any module, so one unreachable remote would make all of them fail.

### SSR consumer

The SSR consumer (`portal-shell-ssr`) uses React Router 7 in framework mode. The shell chrome (nav, header, layout) is server-rendered for fast first paint. Federated producers load as client-only islands: the server renders a loading placeholder, then the MF runtime loads the producer's component after hydration.

This uses `@module-federation/runtime` directly (not a build plugin) to avoid conflicts with React Router 7's Vite plugin. React and react-dom are passed to `init()` as `shared.lib` factories, which is what lets the remotes load in `react-router dev` without a webpack share scope. Remote loading works in dev for all three producers. Only the dev server has been checked against live remotes; the production server (`npm start -w portal-shell-ssr`) has not.

## Migration challenges: shared modules

See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for the full guide covering shared module configs, migration paths, and cross-bundler interop.

## Links

- [Module Federation](https://module-federation.io/)
- [@module-federation/enhanced](https://www.npmjs.com/package/@module-federation/enhanced)
- [Rspack Module Federation](https://rspack.rs/guide/features/module-federation)
- [Vite Module Federation](https://www.npmjs.com/package/@module-federation/vite)
