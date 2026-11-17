import { readFileSync } from "node:fs";
import buildTimeRemotes from "../remotes.json" with { type: "json" };
import { parseRemotesMap, registerRuntimeRemotes, type RemotesMap } from "./remotes";

/**
 * Optional runtime override, read once at startup from MF_REMOTES: either a JSON object
 * ({"people": "https://.../mf-manifest.json"}) or the path to a JSON file. Remotes it
 * doesn't name keep their entry from remotes.json.
 */
function readRemotesOverride(): RemotesMap {
  const value = process.env.MF_REMOTES?.trim();
  if (!value) return {};
  const json = value.startsWith("{") ? value : readFileSync(value, "utf8");
  return parseRemotesMap(json, "MF_REMOTES");
}

/**
 * The remotes this server loads from. The root loader hands the same map to the browser,
 * which registers it before hydrating, so both sides load each remote from one place.
 */
export const remotes: RemotesMap = { ...buildTimeRemotes, ...readRemotesOverride() };

registerRuntimeRemotes(remotes);
