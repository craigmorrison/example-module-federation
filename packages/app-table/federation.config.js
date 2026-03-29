const deps = require('./package.json').dependencies;

module.exports = {
  name: 'table',
  filename: 'table-remote-entry.js',
  exposes: {
    './Table': './src/components/table.jsx'
  },
  shared: {
    react: { eager: true, singleton: true, requiredVersion: deps.react },
    'react-dom': { eager: true, singleton: true, requiredVersion: deps['react-dom'] }
  }
};
