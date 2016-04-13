/**
 * Created by kevin on 16-4-12.
 */
'use strict'
const app = require('express')();
const fs = require('fs');
const multer = require('multer');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
let webpackConfig = require('./webpack.config');
const compile = process.argv.findIndex((a) => a.toLowerCase() === '-c') !== -1;
const upload = multer({
    dest: 'upload/'
});
if (compile) {
    webpackConfig.plugins.push(new webpack.optimize.UglifyJsPlugin({
        compress: {warnings: false}
    }));
    webpack(webpackConfig).run((err, stats)=> {
        console.log('[webpack compiled]', err ? err : stats);
    });
}
else {
    webpackConfig.entry.app.unshift('webpack-dev-server/client?http://localhost:8080/', 'webpack/hot/dev-server');
    webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
    const compiler = webpack(webpackConfig);
    app.use(webpackDevMiddleware(compiler, {
        //noInfo:true,
        contentBase: './assets',
        publicPath: '/assets'
    }));
    app.use(webpackHotMiddleware(compiler));
    app.get('/', (req, res)=> {
        res.sendFile(__dirname + '/index.html');
    });
    app.post('/authorize1', upload.any(), (req, res, next)=> {
        console.log(req.files, req.body);
        res.send(JSON.stringify({status: 'success', action: 'library'}));
    });
    app.delete('/library', (req, res, next)=> {
        res.send(JSON.stringify({status: 'success', action: 'library'}));
    })
    app.post('/library', upload.any(), (req, res, next)=> {
        console.log(req.files);
        res.send(JSON.stringify({
            status: 'success',
            id: req.files[0].filename,
            action: 'library'
        }));
    });
    app.listen(8080, 'localhost', function () {
        console.log('server is running at http://0.0.0.0:8080');
    })
}