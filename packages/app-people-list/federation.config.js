import pkg from "./package.json" with { type: "json" };

const deps = pkg.dependencies;

export default {
  name: "people",
  filename: "people-remote-entry.js",
  exposes: {
    "./People": "./src/components/people/people.tsx",
  },
  shared: {
    react: { singleton: true, requiredVersion: deps.react },
    "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
    "@tanstack/react-query": { singleton: true, requiredVersion: deps["@tanstack/react-query"] },
  },
};
