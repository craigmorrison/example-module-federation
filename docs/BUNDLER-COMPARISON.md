# Bundler Comparison for Module Federation

A practical comparison of Webpack, Rspack, and Vite as Module Federation producer bundlers, based on what we learned building this repo.

## Summary

| | Webpack | Rspack | Vite 8 |
|---|---|---|---|
| **MF version** | v1 (native) or v2 (enhanced) | v2 (enhanced) | v2 (vite plugin) |
| **Dev server** | webpack-dev-server | @rspack/dev-server | vite dev / vite preview |
| **Transpiler** | swc-loader | builtin:swc-loader | Rolldown (built-in) |
| **Dev mode MF** | Works with all consumers | Works with all consumers | **Only works with Vite consumers** |
| **Production MF** | Works with all consumers | Works with all consumers | Works with all consumers |
| **Remote entry format** | UMD (classic script) | UMD (classic script) | ESM (module) |
| **Build speed** | ~1-2s | ~70-130ms | ~1.5s |

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

| | `vite dev` | `vite build + preview` |
|---|---|---|
| HMR | Yes | No (requires rebuild) |
| Speed | Instant startup | Build step on every change |
| Cross-bundler compat | **No** | Yes |
| Consumer compatibility | Vite consumers only | All consumers |

### When Vite dev mode works

- **Vite consumer + Vite producer**: Both sides use native ESM, no format mismatch
- **Standalone development**: Running the producer app on its own (not federated)

### When it doesn't

- **Webpack consumer + Vite producer (dev)**: Script tag can't load ESM
- **Rspack consumer + Vite producer (dev)**: Same issue
- **SSR consumer + Vite producer (dev)**: The MF runtime uses `loadRemote()` which may handle ESM, but Vite's HMR preamble still causes issues

## Rspack: the easy migration from webpack

Rspack configs are nearly identical to webpack. The main differences:

```js
// Webpack
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
loader: 'swc-loader'

// Rspack
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
loader: 'builtin:swc-loader'
```

Everything else — devServer config, shared module config, federation config — is the same. Rspack is a drop-in replacement for webpack with 10-20x faster builds.

Remote entries produced by rspack are UMD format, identical to webpack's output. Any consumer (webpack, rspack, or the MF runtime) can load them as classic `<script>` tags with no compatibility issues.

## Webpack: the safe default

Native webpack Module Federation (v1) is the most battle-tested option. The `@module-federation/enhanced` plugin (v2) adds the runtime SDK, manifest support, and type hints while remaining backward-compatible.

Webpack producers work with every consumer in both dev and production. If you're migrating an existing MFE ecosystem, keeping producers on webpack until you've validated the consumer upgrade is the lowest-risk approach.

## SSR consumer limitations

The SSR consumer (`portal-shell-ssr`) uses React Router 7 framework mode with `@module-federation/runtime` for client-side remote loading. In dev mode, this hits the same cross-bundler compatibility wall:

| Producer bundler | SSR consumer (dev) | Error |
|---|---|---|
| webpack (counter) | Duplicate React instances | `useState` throws — two React copies, shared scope not negotiated |
| rspack (table) | Rspack internals not resolved | `can't access '__rspack_default_export' before initialization` |
| vite (people) | CJS/ESM mismatch | `require is not defined` — federation.config.js uses CJS |

**Root cause**: The `@module-federation/runtime` `loadRemote()` in a Vite dev context doesn't negotiate shared modules with webpack/rspack producers. The producers' remote entries expect a webpack-like `__webpack_share_scopes__` runtime that doesn't exist in Vite's ESM environment.

**The SSR shell architecture is sound** — the server-rendered shell chrome works, client-only Suspense islands work, splat catch-all routes work. The gap is in the MF runtime's ability to bridge shared scopes across bundler formats in dev mode.

**In production** (all packages built), the formats align and cross-bundler federation works. The dev mode limitation applies to both the SPA consumer (worked around with `vite build + preview`) and the SSR consumer (not yet worked around).

A production-ready SSR consumer would need either:
- All producers to output webpack-compatible UMD remote entries (which rspack does natively, but vite doesn't in dev)
- A `build + serve` workflow for all producers (losing HMR everywhere)
- All producers and the consumer on the same bundler

## Recommendation for migration

1. **Start with webpack everywhere** (current state for most orgs)
2. **Upgrade the consumer to MF v2** (`@module-federation/enhanced`)
3. **Migrate producers to rspack first** — minimal config changes, massive build speed improvement, no dev mode issues
4. **Migrate to vite last** (if at all) — only when you're comfortable with the build+preview dev workflow, or when your consumer is also on vite
