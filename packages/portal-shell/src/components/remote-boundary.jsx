import { Component, Suspense, useState } from "react";
import { lazyRemote } from "../remotes";

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    return error ? this.props.fallback(error) : this.props.children;
  }
}

/**
 * Loads one federated module (e.g. "table/Table") behind its own error boundary and
 * Suspense, so a remote that is down shows a retryable message instead of taking the
 * shell down with it.
 */
function RemoteBoundary({ id, name }) {
  const [attempt, setAttempt] = useState(0);
  // React.lazy caches a rejected import, so a retry needs a fresh lazy component.
  const [Remote, setRemote] = useState(() => lazyRemote(id));

  const retry = () => {
    setRemote(() => lazyRemote(id));
    setAttempt((count) => count + 1);
  };

  return (
    <ErrorBoundary
      key={attempt}
      fallback={(error) => (
        <section role="alert">
          <h2>{name} is unavailable</h2>
          <p>
            The {name} remote could not be loaded: {error.message}
          </p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </section>
      )}
    >
      <Suspense fallback={<p>Loading {name}...</p>}>
        <Remote />
      </Suspense>
    </ErrorBoundary>
  );
}

export default RemoteBoundary;
