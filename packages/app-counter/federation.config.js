const deps = require('./package.json').dependencies;

module.exports = {
  name: 'counter',
  filename: 'counter-remote-entry.js',
  exposes: {
    './Counter': './src/components/counter.jsx'
  },
  shared: {
    react: { eager: true, singleton: true, requiredVersion: deps.react },
    'react-dom': { eager: true, singleton: true, requiredVersion: deps['react-dom'] }
  }
};
