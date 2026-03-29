import { init } from '@module-federation/runtime';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

init({
  name: 'shell-ssr',
  remotes: [
    { name: 'table', entry: 'http://localhost:3001/table-remote-entry.js' },
    { name: 'counter', entry: 'http://localhost:3002/counter-remote-entry.js' },
    { name: 'people', entry: 'http://localhost:3003/mf-manifest.json' }
  ],
  shared: {
    react: { version: '19', scope: 'default', lib: () => require('react'), shareConfig: { singleton: true, eager: true } },
    'react-dom': { version: '19', scope: 'default', lib: () => require('react-dom'), shareConfig: { singleton: true, eager: true } }
  }
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>
  );
});
