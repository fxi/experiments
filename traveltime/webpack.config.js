/* jshint esversion:6 */

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require("path");
module.exports = {
  mode : 'development',
  entry: './index.js',
  output: {
    path:path.resolve(__dirname,'../docs/traveltime/'),
    filename: 'index_bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template : './index.html',
      title : 'Travel Time'
    }),
    new CopyWebpackPlugin(
      [ { 
        from : './landcover.tiff', 
        to: 'landcover.tiff'
      } ]
    ),
  ],
  module : {
    rules: [
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader'
        }
      },
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader" }
        ]
      },
      { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' } 
    ]
  }
};
