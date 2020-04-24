const webpack = require("webpack");
const path = require("path");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
  devtool: "source-map",
  mode: process.env.NODE_ENV || "development",
  optimization: {
    splitChunks: {
      chunks: "all",
      name: "vendors"
    }
  },
  entry: {
    index: [isDev && "webpack-hot-middleware/client", "./src"].filter(Boolean)
  },
  output: {
    path: path.resolve("public"),
    chunkFilename: "[name].chunk.js",
    filename: "[name].js"
  },
  devServer: {
    hot: isDev
  },
  module: {
    rules: [{ test: /\.jsx?$/, loader: "babel-loader" }]
  },
  plugins: isDev
    ? [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin()
      ]
    : undefined
};
