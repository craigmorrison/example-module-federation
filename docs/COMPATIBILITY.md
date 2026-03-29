# Module Federation v1/v2 Compatibility Guide

A practical reference for migrating from native webpack Module Federation (v1) to `@module-federation/enhanced` (v2), covering shared module configurations, migration paths, and cross-bundler interop.

> **Terminology**: MF v2 uses **consumer** (the app that loads federated modules via `remotes`) and **producer** (the app that exposes modules via `exposes`). The older terms "host" and "remote" refer to the same concepts.

## Migration paths

There are two valid migration orders. Which one you use depends on your shared module configuration.

### Path A: Consumer first (recommended when possible)

```
1. Upgrade the consumer to @module-federation/enhanced v2
2. Deploy — v2 consumer loads v1 producers via backward-compatible shared scope patching
3. Migrate producers one-by-one to v2
4. Each migrated producer gains access to rspack/vite bundler options
```

**Use when**: simple shared config, few shared deps, consistent `eager`/`singleton` settings across all producers, no `strictVersion`, no custom share scopes.

### Path B: Producers first

```
1. Migrate one low-risk producer to v2
2. Deploy behind the existing v1 consumer — v2 producers still produce standard
   remoteEntry.js files that v1 consumers can load
3. Validate shared module behavior in production
4. Migrate more producers
5. Upgrade the consumer last
```

**Use when**: complex shared config, `strictVersion: true` on producers, custom share scopes, custom runtime code that touches webpack sharing internals, or too many shared deps to audit safely.

**Note**: v2-specific features (manifest, type hints, preloading, Chrome devtools) are not available until both consumer and producer are on v2. Path B gives you a safe rollout but delays v2 benefits.

---

## Shared module configuration matrix

### `eager`

| Consumer | Producer | Result |
|---|---|---|
| `true` | `true` | Both bundle their own copy. The shared scope negotiation picks one at runtime. No async loading needed. **Safest configuration.** |
| `true` | `false` | Consumer's copy is available synchronously. Producer's copy loads async during `import('./bootstrap')`. Works if the producer has the async bootstrap pattern. |
| `false` | `true` | Producer's copy is available synchronously but the consumer hasn't initialised the shared scope yet. **Can cause load-order failures** — the producer's eager copy may not register in time. |
| `false` | `false` | Both copies load async. Requires the bootstrap pattern on both sides. Standard MF v1 setup. Works in v1→v2 migration as long as both sides have the async boundary. |

**Key point**: `eager` is a build-time decision that changes the webpack chunk graph. It cannot be negotiated at runtime. Changing it during migration changes how chunks are structured and can break other producers that depend on the loading order.

**Cross-bundler note**: `eager` has no meaning in Vite's dev server (native ESM). `@module-federation/vite` handles shared modules differently during `vite dev` vs production builds. The config is honoured in production.

### `singleton`

| Consumer | Producer | Result |
|---|---|---|
| `true` | `true` | Only one instance of the module exists at runtime. The shared scope picks the best version (usually highest semver match). **Required for React** — multiple instances break hooks and context. |
| `true` | `false` | Consumer wants a singleton, producer doesn't care. The consumer's singleton wins and the producer uses it. Works fine. |
| `false` | `true` | Producer wants a singleton but the consumer doesn't enforce it. The producer will still try to register as singleton, but the consumer may have already loaded its own non-singleton copy. **Can cause duplicate instances.** |
| `false` | `false` | Each side loads its own copy. Fine for stateless utilities (lodash, date-fns). **Not safe for React, state managers, or anything with module-level state.** |

### `requiredVersion`

| Configuration | Behavior |
|---|---|
| Set on both sides, ranges overlap | Shared scope picks a version satisfying both ranges. Works correctly. |
| Set on both sides, ranges don't overlap | Each side falls back to its own bundled copy. Produces a runtime warning. With `singleton: true`, the first version to load wins — which may not satisfy the other side's range. |
| Set on one side only | The side without `requiredVersion` accepts any version. The side with it gets version validation. |
| Not set on either side | Any version wins. No validation. First to register in the shared scope is used by everyone. **Risky with singleton deps.** |

**Recommendation**: Always set `requiredVersion: deps['package-name']` — it reads from package.json so it stays in sync automatically and gives you runtime warnings on mismatches.

### `strictVersion`

| Value | Behavior |
|---|---|
| `false` (default) | Version mismatches produce a console warning. The app continues running with the mismatched version. |
| `true` | Version mismatches **throw a runtime error** and the app crashes. |

**Migration risk**: If v1 producers use `strictVersion: true` and the v2 consumer's shared scope resolution picks a different "winner" version than v1 did, those producers crash at runtime with no graceful fallback. The v2 runtime has a slightly different resolution algorithm that usually picks the same version, but with complex dependency trees (many producers providing different patch versions), the winner can change.

**Recommendation**: Avoid `strictVersion: true` during migration. If you must keep it, migrate those producers to v2 first so both sides use the same resolution algorithm.

### `shareScope`

| Configuration | Behavior |
|---|---|
| Default (`'default'`) | All packages share a single scope. v2's backward-compatibility patching covers this. **Use this.** |
| Custom name | Creates an isolated sharing scope. v2's patching only covers the `'default'` scope — custom scopes are not bridged between v1 and v2 runtimes. Shared modules resolve from an empty scope and fall back to bundled copies, causing duplicate instances for singletons. |

**Migration risk**: If any producer uses a custom `shareScope`, the v2 consumer cannot negotiate shared modules with it. You must migrate that producer to v2 (so both sides use the same runtime) or move it back to the default scope before upgrading the consumer.

---

## v1 ↔ v2 runtime interop

### How v2 backward compatibility works

`@module-federation/enhanced` patches webpack's sharing APIs (`__webpack_init_sharing__`, `__webpack_share_scopes__`) so that v1 producers can register their shared modules into the v2 consumer's scope. The flow:

```
v2 consumer loads
  → initialises @module-federation/enhanced runtime
  → patches __webpack_share_scopes__['default']
  → fetches v1 producer's remote entry (standard remoteEntry.js)
    → v1 producer calls __webpack_init_sharing__('default')
    → patched function bridges into v2 shared scope
    → v1 producer registers its shared modules
  → v2 runtime negotiates versions across v1 + v2 providers
  → winner is used by all sides
```

This works transparently for the `'default'` scope with standard shared configs.

### What breaks the interop

| Scenario | Why it breaks | Workaround |
|---|---|---|
| v1 consumer + v2 producer (advanced features) | v1 consumer can load v2's `remoteEntry.js` (standard format), but v2 runtime features aren't initialised | Producers-first migration (Path B) — basic functionality works, v2 features are deferred |
| Custom `shareScope` names | v2 patching only covers `'default'` | Move all packages to `'default'` scope before migrating |
| Manual `__webpack_init_sharing__` calls | Custom runtime code may bypass v2's patches | Audit and update custom bootstrap code |
| `strictVersion: true` + different resolution winner | v2 resolution may pick a different version than v1 did | Remove `strictVersion` during migration or migrate affected producers first |
| Side-effect-dependent load order | v2 may resolve shared modules in a different order | Remove side effects from shared modules, or use `eager: true` to make order deterministic |

---

## Cross-bundler shared module behavior

### Webpack ↔ Rspack

Rspack's Module Federation is highly compatible with webpack's. Both use the same shared scope negotiation protocol. `@module-federation/enhanced` provides unified plugins for both:

```js
// webpack
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

// rspack
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
```

Shared module configs (`eager`, `singleton`, `requiredVersion`) behave identically. A webpack producer and an rspack producer can coexist under the same consumer with no special configuration. Rspack uses `builtin:swc-loader` instead of `swc-loader` but this only affects build-time — the output format is the same.

### Webpack/Rspack ↔ Vite

`@module-federation/vite` bridges Vite's native ESM architecture with the MF shared scope protocol. Key differences:

| Behavior | Webpack/Rspack | Vite |
|---|---|---|
| `eager: true` | Module bundled into the entry chunk | **Ignored in dev** (native ESM). Honoured in production build. |
| `singleton: true` | Enforced via shared scope at runtime | Enforced in production. In dev, depends on Vite's module resolution. |
| `requiredVersion` | Checked at runtime | Checked at runtime in production. **Not checked in dev.** |
| Dev server | webpack-dev-server / @rspack/dev-server | Vite dev server (native ESM, no bundling) |
| Remote entry format | Standard `remoteEntry.js` | Standard `remoteEntry.js` (production) |
| Chunk splitting | Respects `eager` flag | `@module-federation/vite` manages chunks automatically — `build.rollupOptions.output.manualChunks` must not be used |

**Practical implications**:
- In production builds, all three bundlers produce compatible remote entries and negotiate shared modules the same way
- In dev, Vite behaves differently — shared modules may be duplicated or resolved differently than in webpack/rspack. **Always test shared module behavior with production builds**, not just dev servers
- Version strings must be valid semver for cross-bundler negotiation to work. Non-semver strings (git hashes, `"latest"`, `"workspace:*"`) break negotiation silently

---

## The async bootstrap pattern

Every producer entry point must follow this pattern for shared modules to resolve correctly:

```js
// app.js (the actual entry point)
import('./bootstrap');
```

```jsx
// bootstrap.jsx (the async boundary)
import { createRoot } from 'react-dom/client';
import App from './components/app';

createRoot(document.getElementById('root')).render(<App />);
```

### Why this is required

The dynamic `import()` creates an async chunk boundary. When webpack/rspack encounters this, it inserts the shared module negotiation logic _before_ the chunk loads. Without it:

- `eager: false` shared modules are `undefined` at import time
- `singleton` negotiation hasn't happened yet
- The producer's `remoteEntry.js` hasn't registered its shared modules

### When you can skip it

- **`eager: true` on all shared modules in all packages**: The modules are bundled into the entry chunk, so no async resolution is needed. But this increases bundle size and makes shared scope negotiation less flexible.
- **Vite in dev mode**: `@module-federation/vite` handles the async boundary internally. But you still need the pattern for webpack/rspack compatibility.

### Common mistakes

| Mistake | Symptom | Fix |
|---|---|---|
| No async boundary, `eager: false` | `Cannot read properties of undefined` on shared module imports | Add the `app.js` → `import('./bootstrap')` pattern |
| Importing shared modules in `app.js` (before the boundary) | Shared modules resolve before negotiation | Move all shared module imports to `bootstrap.jsx` or deeper |
| Multiple async boundaries (nested dynamic imports) | Shared modules resolved multiple times, potential duplicates | Single async boundary at the entry point, synchronous imports after that |

---

## Configuration recommendations

### For new projects

```js
shared: {
  react: { eager: true, singleton: true, requiredVersion: deps.react },
  'react-dom': { eager: true, singleton: true, requiredVersion: deps['react-dom'] }
}
```

Use `eager: true` for core framework deps (React, react-dom). Use `eager: false` for larger optional deps (design systems, data fetching libraries) to keep bundle sizes down.

### For v1 → v2 migration

1. **Do not change `eager` settings during migration** — it changes the chunk graph
2. **Keep `requiredVersion` set** — it provides runtime safety during the transition
3. **Remove `strictVersion: true`** temporarily — reintroduce after all packages are on v2
4. **Move any custom `shareScope` to `'default'`** before upgrading the consumer
5. **Audit shared deps for side effects** — v2 may resolve them in a different order

### For cross-bundler setups

1. **Use `federation.config.js`** per producer — a single source of truth consumed by webpack, rspack, and vite configs
2. **Always test with production builds** — dev server behavior differs across bundlers, especially Vite
3. **Use semver version strings everywhere** — non-semver breaks cross-bundler negotiation
4. **Pin `@module-federation/enhanced` to the same version** across all v2 packages — runtime version mismatches can cause subtle negotiation bugs
