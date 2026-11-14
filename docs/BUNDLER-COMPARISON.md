# Bundler Comparison for Module Federation

A practical comparison of Webpack, Rspack, and Vite as Module Federation producer bundlers, based on what we learned building this repo.

## Summary

|                         | Webpack                      | Rspack                   | Vite 8                             |
| ----------------------- | ---------------------------- | ------------------------ | ---------------------------------- |
| **MF version**          | v1 (native) or v2 (enhanced) | v2 (enhanced)            | v2 (vite plugin)                   |
| **Dev server**          | webpack-dev-server           | @rspack/dev-server       | vite dev / vite preview            |
| **Transpiler**          | swc-loader                   | builtin:swc-loader       | Rolldown (built-in)                |
| **Dev mode MF**         | Works with all consumers     | Works with all consumers | **Only works with Vite consumers** |
| **Production MF**       | Works with all consumers     | Works with all consumers | Works with all consumers           |
| **Remote entry format** | UMD (classic script)         | UMD (classic script)     | ESM (module)                       |
| **Build speed**         | ~1-2s                        | ~70-130ms                | ~1.5s                              |

## The Vite dev mode limitation

**This is the biggest gotcha in cross-bundler Module Federation.**

Vite's dev server serves all modules as native ESM with HMR preamble injection. When a non-Vite consumer (webpack or rspack) tries to load a Vite-served remote entry as a classic `<script>` tag, it fails with:

```
@vitejs/plugin-react can't detect preamble. Something is wrong.
```

This happens because:

1. Webpack/rspack consumers inject `<script>` tags to load remote entries
2. Vite's dev server serves ES modules with `import` statements and HMR hooks
3. Classic `<script>` tags cannot execute ES module code
4. Even with `crossOriginLoading: 'anonymous'`, the fundamental format mismatch remains

**This is NOT a CORS issue** — the headers are fine. It's a module format incompatibility between Vite's dev server and webpack's remote loading mechanism.

### Workaround: build + preview

In this repo, the Vite producer (`app-people-list`) uses `vite build && vite preview` instead of `vite dev`:

```json
{
  "dev": "tsc && vite build && vite preview --port 3003 --strictPort"
}
```

This builds the production bundle (which outputs standard JS) and serves it via Vite's preview server with CORS headers. The webpack consumer loads `mf-manifest.json` (not `remoteEntry.js` directly) which tells the MF runtime the entry is `"type": "module"` — allowing it to use dynamic `import()` instead of a `<script>` tag.

### Tradeoff

|                        | `vite dev`          | `vite build + preview`     |
| ---------------------- | ------------------- | -------------------------- |
| HMR                    | Yes                 | No (requires rebuild)      |
| Speed                  | Instant startup     | Build step on every change |
| Cross-bundler compat   | **No**              | Yes                        |
| Consumer compatibility | Vite consumers only | All consumers              |

### When Vite dev mode works

- **Vite consumer + Vite producer**: Both sides use native ESM, no format mismatch
- **Standalone development**: Running the producer app on its own (not federated)

### When it doesn't

- **Webpack consumer + Vite producer (dev)**: Script tag can't load ESM
- **Rspack consumer + Vite producer (dev)**: Same issue
- **SSR consumer + Vite producer (dev)**: The MF runtime uses `loadRemote()` which may handle ESM, but Vite's HMR preamble still causes issues

## Rolldown native MF: the future fix (not yet available)

Rolldown (Vite 8's underlying Rust bundler) has **native Module Federation merged into its git main branch** (March 2025, announced by Evan You). This is not a plugin — it's built-in MF at the bundler level, implementing webpack-compatible `__webpack_share_scopes__` semantics.

When this lands in a published Rolldown release, it should fix the cross-bundler dev mode issues because:

- Vite producers would speak the same shared scope protocol as webpack/rspack
- No need for `@module-federation/vite` plugin (which is the broken layer)
- Dev mode and production would use the same MF implementation

**Current status** (as of March 2026):

- Vite 8.0.3 ships with `rolldown@1.0.0-rc.12` — **native MF is NOT in this release**
- `@module-federation/vite` (the plugin) is still the only option for Vite MF
- The Rolldown example repo (`rolldown/rolldown-vite-module-federation-example`) has open issues — the implementation is still rough
- No `moduleFederationPlugin` export exists in any published `rolldown` package

**When to revisit**: Watch for Rolldown 1.0 stable release and check if `moduleFederationPlugin` appears in the exports. When it does, replace `@module-federation/vite` with the native plugin and retest cross-bundler dev mode.

## Rspack: the easy migration from webpack

Rspack configs are nearly identical to webpack. The main differences:

```js
// Webpack
const { ModuleFederationPlugin } = require("@module-federation/enhanced/webpack");
loader: "swc-loader";

// Rspack
const { ModuleFederationPlugin } = require("@module-federation/enhanced/rspack");
loader: "builtin:swc-loader";
```

Everything else — devServer config, shared module config, federation config — is the same. Rspack is a drop-in replacement for webpack with 10-20x faster builds.

Remote entries produced by rspack are UMD format, identical to webpack's output. Any consumer (webpack, rspack, or the MF runtime) can load them as classic `<script>` tags with no compatibility issues.

## Webpack: the safe default

Native webpack Module Federation (v1) is the most battle-tested option. The `@module-federation/enhanced` plugin (v2) adds the runtime SDK, manifest support, and type hints while remaining backward-compatible.

Webpack producers work with every consumer in both dev and production. If you're migrating an existing MFE ecosystem, keeping producers on webpack until you've validated the consumer upgrade is the lowest-risk approach.

## SSR consumer

The SSR consumer (`portal-shell-ssr`) uses React Router 7 framework mode with `@module-federation/runtime` for client-side remote loading. The shell chrome is server-rendered and the remotes load as client-only islands after hydration.

**Dev mode works** with all three producers (webpack counter, rspack table, vite people) when the runtime is given React explicitly. An earlier version of this repo failed because it relied on the bundler's share scope, which Vite does not provide:

| Producer bundler  | Earlier failure                                                 |
| ----------------- | --------------------------------------------------------------- |
| webpack (counter) | `useState` threw: two React copies, shared scope not negotiated |
| rspack (table)    | `can't access '__rspack_default_export' before initialization`  |
| vite (people)     | `require is not defined`, from the federation config being CJS  |

What fixed it, in `packages/portal-shell-ssr/app/federation.client.ts`:

- `init()` receives `shared: { react: { lib: () => React, ... }, 'react-dom': { lib: () => ReactDOM, ... } }`, so the runtime has its own shared scope with the shell's React and never needs `__webpack_share_scopes__`.
- Producers no longer set `eager: true`, so their remote entries don't bundle a second React that would win the negotiation.
- Remotes are registered from `/remotes.json` and consumed through `mf-manifest.json` where the producer has one.

Only the dev server (`react-router dev`) was exercised. `react-router build` succeeds, but the built server has not been checked against live remotes. The remote islands still render on the client only, so there is no SSR of remote content.

## Consumer bundler choice

The consumer (shell) has stricter requirements than producers because it controls the shared scope runtime.

| Consumer bundler                           | v1 producers                                                        | v2 producers                                       | SSR support                                                    |
| ------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| **webpack** (native MF v1)                 | Full compat                                                         | Can load `remoteEntry.js` but no manifest features | Custom Express SSR with `@module-federation/node`              |
| **rspack** (native v1.5)                   | Full compat (same protocol as webpack)                              | Can load `remoteEntry.js` but no manifest features | Custom SSR possible                                            |
| **rspack** (`@module-federation/enhanced`) | Manifest resolution can fail with v1 producers                      | Full compat                                        | Custom SSR possible                                            |
| **vite**                                   | Works with the runtime API and explicit `shared` `lib`s (see above) | Works                                              | React Router 7 framework mode (shell SSR, remotes client-only) |
| **Next.js** (webpack mode)                 | Via `@module-federation/nextjs-mf`                                  | Via `@module-federation/nextjs-mf`                 | Built-in SSR                                                   |
| **Next.js** (Turbopack)                    | **No MF support**                                                   | **No MF support**                                  | N/A                                                            |

**Key finding**: Vite has no `__webpack_share_scopes__`, so a Vite consumer cannot rely on a bundler plugin to negotiate shared modules with webpack or rspack producers. Using `@module-federation/runtime` directly and passing React in as `shared.lib` works around that.

**Consumer bundler used here**: rspack with `@module-federation/enhanced`. It consumes the MF 2 producers through `mf-manifest.json` and the native v1 webpack producer through its plain remote entry, with remotes registered at runtime (`registerRemotes`), so the v1/v2 mix works without a native v1.5 consumer. Rspack's built-in v1.5 plugin remains the lowest-risk choice if every producer is v1.

## Recommendation for migration

1. **Start with webpack everywhere** (current state for most orgs)
2. **Migrate the consumer to rspack native v1.5** — same MF protocol, 10-20x faster builds, no producer changes needed
3. **Migrate producers to rspack** — minimal config changes, massive build speed improvement, no dev mode issues
4. **Upgrade consumer + producers to MF v2** (`@module-federation/enhanced`) once all producers are migrated — unlocks manifests, type hints, devtools
5. **Migrate producers to vite last** (if at all) — only when comfortable with build+preview dev workflow. Consumer stays on rspack.
6. **SSR**: Use Next.js (webpack mode) with `@module-federation/nextjs-mf`, or custom rspack SSR. Vite-based SSR (React Router 7) works for client-only remote islands in dev, as in `portal-shell-ssr`, but remote content is not server-rendered.
