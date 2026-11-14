const deps = require("./package.json").dependencies;

module.exports = {
  name: "table",
  filename: "table-remote-entry.js",
  exposes: {
    "./Table": "./src/components/table.jsx",
  },
  // MF 2 replaces the app.js -> import('./bootstrap') indirection with async startup.
  experiments: { asyncStartup: true },
  shared: {
    react: { singleton: true, requiredVersion: deps.react },
    "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
  },
};
