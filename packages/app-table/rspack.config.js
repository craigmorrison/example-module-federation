import path from "node:path";
import { HtmlRspackPlugin } from "@rspack/core";
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import federationConfig from "./federation.config.js";

/** @type {import('@rspack/core').Configuration} */
export default {
  entry: "./src/bootstrap.jsx",
  devServer: {
    static: path.join(import.meta.dirname, "dist"),
    port: 3001,
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
    filename: "table.js",
    publicPath: "auto",
    path: path.resolve(import.meta.dirname, "dist"),
    clean: true,
  },
  plugins: [
    new HtmlRspackPlugin({
      template: "./static/index.html",
    }),
    new ModuleFederationPlugin(federationConfig),
  ],
};
