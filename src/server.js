/**
 * a min HTTP server in node
 */
import http from "http"
import urlParser from 'url'
import fs from 'fs'
import path from "path"
import opts from "opts"
import pjson from "pjson";
import dns from 'dns';
import os from 'os';

let version = pjson.version,
    // __dirname 获取的是当前软件的路径，是内置变量；process.cwd()获取的是当前命令行目录
    currentDir = process.cwd();

function exec(cmdStr, _cb) {
    var exec = require('child_process').exec;
    exec(cmdStr, function (err, stdout, stderr) {
        _cb && _cb();
    });
}

function handleRequest(request, response) {
    var urlObject = urlParser.parse(request.url, true);
    var pathname = decodeURIComponent(urlObject.pathname);
    console.log('[' + (new Date()).toUTCString() + '] ' + '"' + request.method + ' ' + pathname + '"');

    var filePath = "";
    //静态文件处理
    filePath = path.join(currentDir, pathname);
    fs.stat(filePath, function (err, stats) {
        if (err) {
            response.writeHead(404, {});
            response.end('File not found!');
            return;
        }
        console.log(stats.isDirectory());
        if (stats.isFile()) {
            fs.readFile(filePath, function (err, data) {
                if (err) {
                    response.writeHead(404, {});
                    response.end('Opps. Resource not found');
                    return;
                }

                if (filePath.indexOf("svg") > 0) {
                    response.writeHead(200, {
                        'Content-Type': 'image/svg+xml; charset=utf-8'
                    });
                } else if (filePath.indexOf("css") > 0) {
                    response.writeHead(200, {
                        'Content-Type': 'text/css'
                    });
                } else {
                    response.writeHead(200, {
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
                        "Access-Control-Allow-Methods": "PUT,POST,GET,DELETE,OPTIONS"
                    });
                }
                response.write(data);
                response.end();
            });

        } else if (stats.isDirectory()) {
            fs.readdir(filePath, function (error, files) {
                if (error) {
                    response.writeHead(500, {});
                    response.end();
                    return;
                }
                var l = pathname.length;
                if (pathname.substring(l - 1) != '/') pathname += '/';


                response.writeHead(200, {
                    'Content-Type': 'text/html'
                });
                response.write('<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>' + filePath + '</title></head><body>');
                response.write('<h1>' + filePath + '</h1>');
                response.write('<ul style="list-style:none;font-family:courier new;">');
                files.unshift('.', '..');
                files.forEach(function (item) {
                    var urlpath, itemStats;
                    urlpath = pathname + item
                    itemStats = fs.statSync(currentDir + urlpath);
                    if (itemStats.isDirectory()) {
                        urlpath += '/';
                        item += '/';
                    }

                    response.write('<li><a href="' + urlpath + '">' + item + '</a></li>');
                });

                response.end('</ul></body></html>');
            });
        }
    });
}
let createServer = function (config) {
    // console.log(config)
    currentDir = config.path || currentDir;
    let port = +(config.port);
    let server = http.createServer(handleRequest).listen(port);
    dns.lookup(os.hostname(), function (err, addr = "127.0.0.1", fam) {
        console.log('server Running at http://' + addr + ((port == 80) ? '' : (':' + port)) + '/');
    })
    if (config.start == "true") {
        //打开浏览器
        exec("start http://127.0.0.1" + ((port == 80) ? '' : (':' + port)) + '/cmpApp/static/index.html');
    }
    return server;
}

// 管理连接
var sockets = [];

export const start = () => {
    opts.parse([{
        short: "v",
        long: "version",
        description: "Show the version",
        required: false,
        callback: function () {
            console.log(version);
            return process.exit(1);
        }
    }, {
        short: "p",
        long: "port",
        description: "Specify the port",
        value: true,
        required: false
    }], true);

    let port = opts.get('port');
    let dir = path.resolve(process.argv[2]) || currentDir;
    let server = createServer({
        port: port || 8888,
        path: dir
    });
    console.log("Starting server for " + dir + " ......");

    server.on("connection", function (socket) {
        sockets.push(socket);
        socket.once("close", function () {
            sockets.splice(sockets.indexOf(socket), 1);
        });
    });

}
export const close = () => {
    //关闭之前，我们需要手动清理连接池中得socket对象
    sockets.forEach(function (socket) {
        socket.destroy();
    });
    server.close(function () {
        console.log("close server!");
    });
};

