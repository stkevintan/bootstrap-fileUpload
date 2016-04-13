'use strict'
const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
    entry: {
        vendor: ["jquery", 'bootstrap-loader'],//基础库
        app: ["./src/scripts/entry.js"]
    },
    output: {
        path: path.resolve('assets/'),
        filename: "bundle.js",
        publicPath: '/assets'
    },
    module: {
        loaders: [
            {
                test: /(\.jsx|\.js)/,
                loader: 'babel',
                exclude: /(node_modules|bower_components)/,
                query: {
                    presets: ['es2015', 'stage-1']
                }
            },
            //load icon-font
            {test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/font-woff'},
            {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=application/octet-stream'},
            {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file'},
            {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url?limit=10000&mimetype=image/svg+xml'},
            //{test: /bootstrap-sass\/assets\/javascripts\//, loader: 'imports?jQuery=jquery' }
            {
                test: /.(css|sass|scss)$/,
                loader: ExtractTextPlugin.extract("style-loader", "css-loader", "sass-loader"),
                exclude: /styles/
            },
            {
                //test the absolute path
                test: /\/_\S*\.(css|sass|scss)$/,
                loader: "style!css!sass"
            },
            {test: /\.(png|jpg)$/, loader: "url-loader?limit=10000&name=[name].[ext]"},
            //{test:/\.jade$/,loader:"jade"}
        ]
    },
    plugins: [
        new webpack.BannerPlugin(`This file is created by Kevin Tan.`),
        //delete js files
        new CleanWebpackPlugin(['assets/'], {
            verbose: true,
            dry: false
        }),
        new ExtractTextPlugin("bundle.css"),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            filename: 'vendor.bundle.js',
            //minChunks:Infinity
            // (with more entries, this ensures that no other module
            //  goes into the vendor chunk)
            minChunks: 3
        }, 'vendors.bundle.js'),
        new webpack.DefinePlugin({
            VERSION: '1.0.0',
            DEBUG: true,
            PRODUCTION: false
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        }),
        new webpack.NoErrorsPlugin()
    ]
}
