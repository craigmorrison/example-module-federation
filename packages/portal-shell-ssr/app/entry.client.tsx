import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { registerRuntimeRemotes } from "./remotes";

// The same remotes the server rendered with (remotes.json plus any MF_REMOTES override).
if (window.__MF_REMOTES__) registerRuntimeRemotes(window.__MF_REMOTES__);

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
