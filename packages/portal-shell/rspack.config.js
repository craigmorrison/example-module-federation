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
    // Runtime remotes config, edit or replace it per environment (see README).
    new rspack.CopyRspackPlugin({ patterns: [{ from: "static/remotes.json" }] }),
    new ModuleFederationPlugin({
      name: "shell",
      filename: "remoteEntry.js",
      shared: {
        react: { eager: true, singleton: true, requiredVersion: federationDeps.react },
        "react-dom": { eager: true, singleton: true, requiredVersion: federationDeps["react-dom"] },
      },
    }),
  ],
};
