import { createRoot } from "react-dom/client";
import Shell from "./components/shell";
import { registerRuntimeRemotes } from "./remotes";

const root = createRoot(document.getElementById("portal-app"));

registerRuntimeRemotes()
  .catch((error) => console.error("Remotes config unavailable, remote routes will fail", error))
  .finally(() => root.render(<Shell />));
