/// <reference types="vite/client" />

// In dev, every component module checks that @vitejs/plugin-react's preamble ran, and
// throws if it didn't. A host page that isn't Vite (the Rspack shell) never runs it,
// so the exposed module stubs the two globals the check looks for. Fast Refresh still
// works when the remote runs standalone, where the real preamble got there first. This
// is guarded rather than importing "@vitejs/plugin-react/preamble", because that
// touches window when the SSR shell loads the remote's dev SSR entry, and it is
// dropped from builds, where import.meta.hot is undefined.
declare global {
  interface Window {
    $RefreshReg$?: unknown;
    $RefreshSig$?: unknown;
  }
}

if (import.meta.hot && typeof window !== "undefined" && !window.$RefreshReg$) {
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type: unknown) => type;
}

export {};
