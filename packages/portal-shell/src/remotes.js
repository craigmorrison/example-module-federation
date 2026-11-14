import { lazy } from "react";
import { loadRemote, registerRemotes } from "@module-federation/enhanced/runtime";

/**
 * Fetch the remotes map ({ name: entryUrl }) served next to the shell and register it
 * with the Module Federation runtime. Entries ending in .json are MF 2 manifests; any
 * other entry is a plain remote entry script (native webpack MF v1 producers).
 */
export async function registerRuntimeRemotes(url = "/remotes.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load remotes config ${url} (HTTP ${response.status})`);
  }
  const remotes = await response.json();
  registerRemotes(Object.entries(remotes).map(([name, entry]) => ({ name, entry })));
}

/** React.lazy wrapper around loadRemote, e.g. lazyRemote("table/Table"). */
export function lazyRemote(id) {
  return lazy(async () => {
    const mod = await loadRemote(id);
    if (!mod) throw new Error(`Remote module ${id} could not be loaded`);
    return mod.default ? mod : { default: mod };
  });
}
