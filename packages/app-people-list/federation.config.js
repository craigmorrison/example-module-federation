const deps = require('./package.json').dependencies;

module.exports = {
  name: 'people',
  filename: 'people-remote-entry.js',
  exposes: {
    './People': './src/components/people/people.tsx'
  },
  shared: {
    react: { eager: true, singleton: true, requiredVersion: deps.react },
    'react-dom': { eager: true, singleton: true, requiredVersion: deps['react-dom'] },
    '@tanstack/react-query': { singleton: true, requiredVersion: deps['@tanstack/react-query'] }
  }
};
