import path from "node:path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import pkg from "./package.json" with { type: "json" };

const { ModuleFederationPlugin } = webpack.container;
const deps = pkg.dependencies;

export default {
  entry: "./src/app.js",
  devServer: {
    static: path.join(import.meta.dirname, "dist"),
    port: 3002,
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
          loader: "swc-loader",
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
    filename: "counter.js",
    path: path.resolve(import.meta.dirname, "dist"),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({ template: "./static/index.html" }),
    new ModuleFederationPlugin({
      name: "counter",
      filename: "counter-remote-entry.js",
      exposes: {
        "./Counter": "./src/components/counter.jsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: deps.react },
        "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
      },
    }),
  ],
};
