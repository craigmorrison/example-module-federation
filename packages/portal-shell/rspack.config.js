const path = require('path');
const rspack = require('@rspack/core');
const federationDeps = require('./package.json').dependencies;

/** @type {import('@rspack/core').Configuration} */
module.exports = {
  entry: './src/app.js',
  mode: 'development',
  devServer: {
    static: path.join(__dirname, 'dist'),
    port: 3000,
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
    filename: 'portal.js',
    path: path.resolve(__dirname, 'dist'),
    crossOriginLoading: 'anonymous',
    clean: true
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './static/index.html' }),
    new rspack.container.ModuleFederationPlugin({
      name: 'shell',
      filename: 'remoteEntry.js',
      remotes: {
        table: 'table@http://localhost:3001/table-remote-entry.js',
        counter: 'counter@http://localhost:3002/counter-remote-entry.js',
        people: 'people@http://localhost:3003/people-remote-entry.js'
      },
      shared: {
        react: { eager: true, singleton: true, requiredVersion: federationDeps.react },
        'react-dom': { eager: true, singleton: true, requiredVersion: federationDeps['react-dom'] }
      }
    })
  ]
};
