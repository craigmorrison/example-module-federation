const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
const federationConfig = require('./federation.config');

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  entry: './src/app.js',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3002,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  module: {
    rules: [
      {
        test: /\.m?jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'ecmascript', jsx: true },
              transform: { react: { runtime: 'automatic' } }
            }
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  output: {
    filename: 'counter.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  plugins: [
    new (require('@rspack/core')).HtmlRspackPlugin({
      template: './static/index.html'
    }),
    new ModuleFederationPlugin(federationConfig)
  ]
};
