import path from "node:path";
import rspack from "@rspack/core";
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import pkg from "./package.json" with { type: "json" };

const federationDeps = pkg.dependencies;

/** @type {import('@rspack/core').Configuration} */
export default {
  entry: "./src/bootstrap.jsx",
  devServer: {
    static: path.join(import.meta.dirname, "dist"),
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
    path: path.resolve(import.meta.dirname, "dist"),
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
      // The default (version-first) loads every remote's entry before any module, so one
      // unreachable remote would break them all. loaded-first resolves shared deps lazily.
      shareStrategy: "loaded-first",
      experiments: { asyncStartup: true },
      shared: {
        react: { singleton: true, requiredVersion: federationDeps.react },
        "react-dom": { singleton: true, requiredVersion: federationDeps["react-dom"] },
      },
    }),
  ],
};
