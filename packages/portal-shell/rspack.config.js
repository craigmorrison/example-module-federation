const path = require("path");
const rspack = require("@rspack/core");
const { ModuleFederationPlugin } = require("@module-federation/enhanced/rspack");
const federationDeps = require("./package.json").dependencies;

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  entry: "./src/app.js",
  devServer: {
    static: path.join(__dirname, "dist"),
    port: 3000,
    historyApiFallback: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  module: {
    rules: [
      {
        test: /\.m?jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "ecmascript", jsx: true },
              transform: { react: { runtime: "automatic" } },
            },
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  output: {
    filename: "portal.js",
    publicPath: "auto",
    path: path.resolve(__dirname, "dist"),
    crossOriginLoading: "anonymous",
    clean: true,
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: "./static/index.html" }),
    new ModuleFederationPlugin({
      name: "shell",
      filename: "remoteEntry.js",
      remotes: {
        // MF 2 producers publish an mf-manifest.json, which the runtime prefers.
        table: "table@http://localhost:3001/mf-manifest.json",
        // app-counter is native webpack MF v1: no manifest, so use its remote entry.
        counter: "counter@http://localhost:3002/counter-remote-entry.js",
        people: "people@http://localhost:3003/mf-manifest.json",
      },
      shared: {
        react: { eager: true, singleton: true, requiredVersion: federationDeps.react },
        "react-dom": { eager: true, singleton: true, requiredVersion: federationDeps["react-dom"] },
      },
    }),
  ],
};
