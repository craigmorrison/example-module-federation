const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const federationConfig = require('./federation.config');

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
            loader: 'swc-loader',
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
      new HtmlWebpackPlugin({ template: './static/index.html' }),
      new ModuleFederationPlugin(federationConfig)
    ]
  };
};
