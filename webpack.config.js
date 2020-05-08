const nodeExternals = require("webpack-node-externals");
const webpack = require("webpack");
const path = require("path");
const marked = require("marked");

const CustomString = require("./src/string");

const isDev = process.env.NODE_ENV !== "production";

const markdownRenderer = new class MarkdownRenderer extends marked.Renderer {
  paragraph(text) {
    Object.entries(CustomString).forEach(([name, symbol]) => {
      text = text.replace(new RegExp(`{${name}} ?`, "g"), symbol);
    });
    return "<p>" + text + "<p>\n";
  }
}();

module.exports = [
  !isDev && {
    target: "node",
    mode: "production",
    entry: {
      index: "./server/index.js"
    },
    output: {
      path: path.resolve("build")
    },
    externals: [nodeExternals()],
    module: {
      rules: [
        { test: /\.jsx?$/, exclude: /node_modules/, loader: "babel-loader" }
      ]
    }
  },
  {
    devtool: "source-map",
    mode: process.env.NODE_ENV || "development",
    // TODO: chunk out vendors, though need to keep track of the crypto package
    // separately, because it's only needed on a save, to validate that someone
    // isn't cheating.
    // optimization: {
    //   splitChunks: {
    //     chunks: "all",
    //     name: "vendors"
    //   }
    // },
    entry: {
      index: [
        isDev && "webpack-hot-middleware/client?reload=true",
        "./src"
      ].filter(Boolean)
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
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: "babel-loader"
        },
        {
          test: /.css$/,
          loader: ["style-loader", "css-loader"]
        },
        {
          test: /\.md$/,
          use: [
            {
              loader: "html-loader"
            },
            {
              loader: "markdown-loader",
              options: {
                pedantic: true,
                renderer: markdownRenderer
              }
            }
          ]
        }
      ]
    },
    plugins: isDev
      ? [
          new webpack.HotModuleReplacementPlugin(),
          new webpack.NoEmitOnErrorsPlugin()
        ]
      : undefined
  }
].filter(Boolean);
