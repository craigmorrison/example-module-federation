const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');
const federationConfig = require('./federation.config');

/** @type {import('@rspack/core').Configuration} */
module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    mode: isProd ? 'production' : 'development',
    entry: path.resolve(__dirname, './src/index.tsx'),
    output: {
      path: path.resolve(__dirname, './dist'),
      filename: '[name]-[contenthash].js',
      clean: true
    },
    devtool: isProd ? 'source-map' : 'eval-source-map',
    devServer: {
      static: path.join(__dirname, 'dist'),
      port: 3003,
      historyApiFallback: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript', tsx: true },
                transform: {
                  react: {
                    runtime: 'automatic',
                    importSource: '@emotion/react'
                  }
                },
                experimental: {
                  plugins: [['@swc/plugin-emotion', {}]]
                }
              }
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    plugins: [
      new (require('@rspack/core')).HtmlRspackPlugin({
        template: './static/index.html'
      }),
      new ModuleFederationPlugin(federationConfig)
    ]
  };
};
