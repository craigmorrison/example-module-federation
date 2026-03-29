import { init } from '@module-federation/runtime';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

init({
  name: 'shell',
  remotes: [
    { name: 'table', entry: 'http://localhost:3001/table-remote-entry.js' },
    { name: 'counter', entry: 'http://localhost:3002/counter-remote-entry.js' },
    { name: 'people', entry: 'http://localhost:3003/people-remote-entry.js' }
  ]
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});
