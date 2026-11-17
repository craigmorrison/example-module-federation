import { registerRemotes } from "@module-federation/runtime";

/** Remote name -> manifest URL (MF 2) or remote entry script URL (native MF v1). */
export type RemotesMap = Record<string, string>;

declare global {
  interface Window {
    /** The remotes the server registered, written into the page by root.tsx. */
    __MF_REMOTES__?: RemotesMap;
  }
}

/**
 * Register remotes with the runtime under their own names, so loadRemote("people/People")
 * uses these entries. Per the @module-federation/vite docs, a remote registered at
 * runtime under a configured remote's name replaces it for loadRemote() calls.
 */
export function registerRuntimeRemotes(remotes: RemotesMap) {
  registerRemotes(
    Object.entries(remotes).map(([name, entry]) => ({ name, entry })),
    // Replace the configured remote, including anything already loaded from it.
    { force: true },
  );
}

/** Parses and checks a remotes map, e.g. from MF_REMOTES. */
export function parseRemotesMap(json: string, source: string): RemotesMap {
  const value: unknown = JSON.parse(json);
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !Object.values(value).every((entry) => typeof entry === "string")
  ) {
    throw new Error(`${source} must be a JSON object of remote name to entry URL`);
  }
  return value as RemotesMap;
}
