var config = require('../config')
if(!config.tasks.js) return

var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var path            = require('path')
var pathToUrl       = require('./pathToUrl')
var webpack         = require('webpack')
var webpackManifest = require('./webpackManifest')
var TerserPlugin = require('terser-webpack-plugin');
var ESLintPlugin = require('eslint-webpack-plugin');

module.exports = function(env) { 
  var jsSrc = path.resolve(config.root.src, config.tasks.js.src)
  var jsDest = path.resolve(config.root.dest, config.tasks.js.dest)
  var publicPath = pathToUrl(config.tasks.js.dest, '/')

  var extensions = config.tasks.js.extensions.map(function(extension) {
    return '.' + extension
  })

  var rev = config.tasks.production.rev && env === 'production'
  var filenamePattern = rev ? '[name]-[hash].js' : '[name].js'

  var webpackConfig = {
    context: jsSrc,
    plugins: [
      new webpack.ProvidePlugin({
        'Promise': 'es6-promise',
      }),
      new ESLintPlugin({
        extensions: ['js'],
        emitWarning: true,
      }),
      // new BundleAnalyzerPlugin(),
    ],
    resolve: {
      extensions: extensions.filter(Boolean),
      modules: [jsSrc, 'node_modules', path.resolve(__dirname, '../../node_modules')]
    },
    node: {
      fs: 'empty',
      child_process: 'empty',
      tls: 'empty',
      net: 'empty',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: config.tasks.js.babel
          }
        },
        { 
          test: /\.json$/, 
          use: 'json-loader'
        },
        // {
        //   test: /\.js$/,
        //   exclude: /node_modules/,
        //   enforce: 'pre',
        //   use: {
        //     loader: 'eslint-loader',
        //     options: {
        //       configFile: './.eslintrc.json'
        //     }
        //   }
        // },
        {
          test: /\.sass$/,
          use: [
            'style-loader',
            'css-loader',
            'sass-loader'
          ]
        }
      ]
    }
  }

  if(env === 'development') {
    webpackConfig.devtool = 'inline-source-map'

    // Create new entries object with webpack-hot-middleware added
    for (var key in config.tasks.js.entries) {
      var entry = config.tasks.js.entries[key]
      config.tasks.js.entries[key] = ['webpack-hot-middleware/client?&reload=true'].concat(entry)
    }

    webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin())
  }

  if(env !== 'test') {
    webpackConfig.entry = config.tasks.js.entries

    webpackConfig.output = {
      path: path.normalize(jsDest),
      filename: filenamePattern,
      publicPath: publicPath
    }

    if(config.tasks.js.extractSharedJs) {
      webpackConfig.optimization = {
        splitChunks: {
          cacheGroups: {
            shared: {
              name: 'shared',
              chunks: 'all',
              minChunks: 2
            }
          }
        }
      }
    }
  }

  if(env === 'production') {
    if(rev) {
      webpackConfig.plugins.push(new webpackManifest(publicPath, config.root.dest))
    }
    webpackConfig.plugins.push(
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify('production')
        }
      }),
      
      new webpack.NoEmitOnErrorsPlugin()
    )
    webpackConfig.optimization = {
      ...webpackConfig.optimization,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            ecma: 2015,
            compress: {
              drop_console: true,
            },
          },
        }),
      ],
    }
  }

  return webpackConfig
}
