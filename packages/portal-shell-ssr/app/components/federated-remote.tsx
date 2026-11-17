import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { loadRemote } from "@module-federation/runtime";

type RemoteModule = { default: ComponentType };

/** Remote module ids; the remotes are registered at runtime (see app/remotes.ts). */
export type RemoteId = "table/Table" | "counter/Counter" | "people/People";

// loadRemote rather than import("people/People"): the plugin binds a remote import to
// the build-time entry, while loadRemote honours remotes registered at runtime. On the
// server it loads a remote's SSR entry, in the browser its browser entry.
async function loadRemoteComponent(remote: RemoteId): Promise<RemoteModule> {
  const mod = await loadRemote<RemoteModule>(remote);
  if (!mod?.default) {
    throw new Error(`Remote "${remote}" did not export a default component`);
  }
  return mod;
}

interface FederatedRemoteProps {
  /** Remote module id, e.g. "people/People". */
  remote: RemoteId;
  /**
   * Render the remote on the server too. Only remotes that publish an SSR entry
   * (metaData.ssrRemoteEntry in their manifest) can do this; the rest render on the
   * client after hydration, as islands, with the fallback in the server HTML.
   */
  ssr?: boolean;
  fallback?: ReactNode;
}

export function FederatedRemote({
  remote,
  ssr = false,
  fallback = <div className="loading-placeholder">Loading {remote}...</div>,
}: FederatedRemoteProps) {
  // One lazy component per mounted remote (and per server render), so a remote that
  // was down on one request is tried again on the next instead of caching the failure.
  const [Remote] = useState(() => lazy(() => loadRemoteComponent(remote)));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!ssr && !mounted) {
    return <>{fallback}</>;
  }

  // If the server render fails (the remote is down or has no SSR entry), React streams
  // the fallback and renders this boundary on the client instead of failing the page.
  return (
    <RemoteErrorBoundary remote={remote}>
      <Suspense fallback={fallback}>
        <Remote />
      </Suspense>
    </RemoteErrorBoundary>
  );
}

class RemoteErrorBoundary extends Component<
  { remote: string; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="loading-placeholder" role="alert">
          Failed to load {this.props.remote}: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
