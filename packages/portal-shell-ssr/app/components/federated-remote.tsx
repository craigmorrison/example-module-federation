import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { loadRemote } from '@module-federation/runtime';

const remoteCache = new Map<string, ComponentType>();

function useFederatedComponent(remote: string) {
  const [Component, setComponent] = useState<ComponentType | null>(
    () => remoteCache.get(remote) ?? null
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (Component) return;

    loadRemote<{ default: ComponentType }>(remote)
      .then((mod) => {
        if (mod?.default) {
          remoteCache.set(remote, mod.default);
          setComponent(() => mod.default);
        } else {
          setError(new Error(`Remote "${remote}" did not export a default component`));
        }
      })
      .catch((err) => {
        setError(err);
      });
  }, [remote, Component]);

  return { Component, error };
}

interface FederatedRemoteProps {
  remote: string;
  fallback?: React.ReactNode;
}

export function FederatedRemote({
  remote,
  fallback = <div className="loading-placeholder">Loading...</div>
}: FederatedRemoteProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      <RemoteLoader remote={remote} />
    </Suspense>
  );
}

function RemoteLoader({ remote }: { remote: string }) {
  const { Component, error } = useFederatedComponent(remote);

  if (error) {
    return <div className="loading-placeholder">Failed to load {remote}: {error.message}</div>;
  }

  if (!Component) {
    return <div className="loading-placeholder">Loading {remote}...</div>;
  }

  return <Component />;
}
