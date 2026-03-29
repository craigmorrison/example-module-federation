const deps = require('./package.json').dependencies;

module.exports = {
  name: 'shell',
  filename: 'remoteEntry.js',
  remotes: {
    table: 'table@http://localhost:3001/table-remote-entry.js',
    counter: 'counter@http://localhost:3002/counter-remote-entry.js',
    people: 'people@http://localhost:3003/people-remote-entry.js'
  },
  shared: {
    react: { eager: true, singleton: true, requiredVersion: deps.react },
    'react-dom': { eager: true, singleton: true, requiredVersion: deps['react-dom'] }
  }
};
