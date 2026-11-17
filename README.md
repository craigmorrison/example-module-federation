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
              │ portal-shell-ssr │  (SSR shell: server-renders people
              │ MF 2, vite plugin│   from its SSR entry; table and
              │  SSR via RR8     │   counter load as client islands)
              │  :4000           │
              └──────────────────┘
```

Three producers, three different bundlers, one consumer that loads them at runtime regardless of how they were built. This demonstrates:

1. **Cross-bundler federation**: webpack, rspack and vite producers all consumed by an rspack consumer on `@module-federation/enhanced` (MF 2)
2. **v1/v2 coexistence**: `app-counter` is deliberately still on native webpack MF v1 and has no manifest, so the shell loads it from its plain remote entry. The MF 2 producers are loaded from `mf-manifest.json`
3. **Runtime configuration**: no remote URL is baked into the shell build, see [Remotes config](#remotes-config)
4. **Failure isolation**: each remote route has its own error boundary, so a remote that is down shows a retryable fallback instead of taking the shell down
5. **SSR of federated remotes**: `portal-shell-ssr` server-renders the people remote through its SSR remote entry, and loads table and counter, which have none, client-side. This works in `react-router dev` and in a production build (see [SSR consumer](#ssr-consumer))

## Stack

| Tool                                                  | Purpose                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| [Module Federation v2](https://module-federation.io/) | Micro-frontend runtime (cross-bundler)            |
| [Rspack](https://rspack.rs/)                          | Consumer bundler + producer (app-table)           |
| [Webpack 5](https://webpack.js.org/)                  | Legacy producer bundler (app-counter)             |
| [Vite 8](https://vite.dev/)                           | Producer bundler (app-people-list) + SSR consumer |
| [SWC](https://swc.rs/)                                | Transpiler (replaces Babel)                       |
| [React 19](https://react.dev/)                        | UI framework                                      |
| [React Router 8](https://reactrouter.com/)            | Routing (SSR consumer uses framework mode)        |
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
npm run dev:ssr       # SSR consumer (:4000) + all producers
```

`dev` starts:

- **http://localhost:3000**: SPA consumer (rspack, MF 2)
- `:3001`: app-table (rspack producer, `mf-manifest.json`)
- `:3002`: app-counter (webpack producer, MF v1 remote entry)
- `:3003`: app-people-list (vite producer, Vite dev server, `mf-manifest.json`)

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

To point at another environment, build the shell once and serve a different `remotes.json` next to it (replace the file in `packages/portal-shell/dist/`, or have your host/CDN serve one per environment). The SSR shell works the same way without a rebuild, through an environment variable:

- `packages/portal-shell-ssr/remotes.json` is the build-time default. `vite.config.ts` passes it to `@module-federation/vite`, which needs the remotes at build time to set up sharing and the server-side runtime.
- At startup the server reads `MF_REMOTES`, either a JSON object or the path to a JSON file, and merges it over that default. Remotes it doesn't name keep their default entry:

  ```shell
  MF_REMOTES='{"people":"https://cdn.example.com/people/mf-manifest.json"}' npm start -w portal-shell-ssr
  MF_REMOTES=/etc/portal/remotes.json npm start -w portal-shell-ssr
  ```

- The server registers the merged map with `registerRemotes()` (`app/remotes.server.ts`). The root loader writes the same map into the page, and the client entry registers it before hydrating, so the browser loads each remote from the same place the server rendered it from.
- Remotes are loaded with `loadRemote()`, which honours runtime registrations. A plain `import("people/People")` would stay bound to the build-time entry.

`app-people-list`'s `dev` runs Vite's dev server, which serves the same `mf-manifest.json` URL as a build. To try the built remote instead, run `npm run build -w app-people-list && npm run preview -w app-people-list`.

Producers use `publicPath: "auto"`, so their assets resolve relative to wherever their entry was loaded from. `app-people-list` builds with a relative Vite `base` for that reason. Set `PUBLIC_URL` when building it (for example `PUBLIC_URL=https://cdn.example.com/people/ npm run build -w app-people-list`) to pin an absolute URL instead.

## Building

```shell
npm run build         # All packages (each uses its own bundler, in production mode)
```

## Testing & linting

```shell
npm test                 # Vitest (unit tests)
npm run test:e2e         # Playwright smoke tests for both shells (starts all dev servers; local only, not in CI)
npm run lint             # Lint (oxlint)
npm run format:check     # Format check (oxfmt)
npm run format           # Format all files (oxfmt)
```

The `chromium` project (`e2e/portal.spec.ts`) drives the Rspack shell: it visits `/table`, `/counter` and `/people` and checks each remote renders (the people remote's SWAPI call is served from a fixture), and checks that the shell keeps working and shows a fallback with a Retry button when one remote is unreachable. The `ssr` project (`e2e/ssr.spec.ts`) drives the SSR shell: it checks that the server HTML for `/people` holds the remote's markup, that table and counter are client-side placeholders in it, and that every route renders and hydrates in the browser without console errors. The server render never calls SWAPI, because React Query doesn't fetch during SSR. The tests need ports 3000 to 3003 and 4000 free (or already serving the dev servers) and a one-off `npx playwright install chromium`.

## How federation works across bundlers

Each v2 producer has a `federation.config.js` with the bundler-agnostic MF config (name, exposes, shared deps). The consumer doesn't care which bundler produced a remote: it loads an `mf-manifest.json` (MF 2 producers) or a remote entry script (the v1 producer) over HTTP.

The v2 runtime from `@module-federation/enhanced` negotiates shared dependencies (React, react-dom) regardless of bundler. Shared React is `singleton` with a `requiredVersion` and is not `eager`, so producers don't bundle their own copy. The shell and app-table use `experiments: { asyncStartup: true }` instead of the `app.js` -> `import('./bootstrap')` indirection. `app-counter` is native webpack v1 and keeps the bootstrap pattern.

The shell uses `shareStrategy: "loaded-first"`. The default (`version-first`) loads every remote's entry before any module, so one unreachable remote would make all of them fail.

### SSR consumer

The SSR consumer (`portal-shell-ssr`) uses React Router 8 in framework mode on Vite, with `federation()` from `@module-federation/vite` next to `reactRouter()` in `vite.config.ts`. The plugin shares React and ReactDOM as singletons and sets up the federation runtime in the browser and on the server. The shell registers the remotes at runtime (see [Remotes config](#remotes-config)) and loads them with `loadRemote()`.

- **people** publishes an SSR remote entry (`people-remote-entry.ssr.js`, listed in its manifest as `metaData.ssrRemoteEntry`), so `/people` is rendered on the server and hydrated in the browser. React Query doesn't fetch on the server, so the server HTML holds the list's loading state.
- **table** and **counter** publish no SSR entry, so they stay client-only islands: the server renders a placeholder and the browser loads them after hydration.
- If a remote can't be rendered on the server (it's down, or has no SSR entry), only its Suspense boundary falls back to client rendering. The page still returns 200.

This works in `react-router dev` and in production (`npm run build -w portal-shell-ssr && PORT=4001 npm start -w portal-shell-ssr`, against built producers). See [docs/BUNDLER-COMPARISON.md](docs/BUNDLER-COMPARISON.md) for what changed and what was checked.

## Migration challenges: shared modules

See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for the full guide covering shared module configs, migration paths, and cross-bundler interop.

## Links

- [Module Federation](https://module-federation.io/)
- [@module-federation/enhanced](https://www.npmjs.com/package/@module-federation/enhanced)
- [Rspack Module Federation](https://rspack.rs/guide/features/module-federation)
- [Vite Module Federation](https://www.npmjs.com/package/@module-federation/vite)
