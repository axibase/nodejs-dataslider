'use strict';

var http = require('http');
var url = require('url');
var _ = require('lodash');
var fs = require('node-fs');
var mime = require('mime');
var path = require('fs');
var async = require('./js/async');
var Parser = require('./js/parser').Parser;
var appRoot = require('app-root-path');
var PropertiesReader = require('properties-reader');
var logger = require('npmlog');
var Cacher = require('./helpers/cacher').Cacher;
var config = require('./config');
var cacher = new Cacher(config.data_folder);
var write = require('./helpers/response-writer').write;
var fileHelper = require('./helpers/file-helper');
var responseWriter = new require('./helpers/response-writer');
var Series = require('atsd-api').Series;
var configer = require('./helpers/configer.js');

var sequence = {};
var index = {};
var parameters = {};

var dirs = [];


var realDir = fs.realpathSync(appRoot.toString());
var realConfig = fs.realpathSync(appRoot + '/config.js');

function realPaths(paths) {
    for (var i = 0; i < paths.length; i++) {
        try {
            paths[i] = fs.realpathSync(paths[i]);
        } catch (e) {
            paths[i] = null;
        }
    }

    return paths
}

var permittedFolders = realPaths(config.permitted_folders);
var allPermittedFolders = realPaths(config.config_folders).concat(permittedFolders).concat(realPaths([config.data_folder]));

function setUpServer(req, res, options) {
    var series = new Series(options);
    var page = url.parse(req.url).pathname;
    logger.info('Requested page:', '%j', page);

    var lastSlash = false;
    if (page[page.length - 1] === '/') {
        lastSlash = true;
    }

    page = page.replace(/\/+$/, '');

    logger.info(new Date().toISOString() + ' ' + page);

    var i_slash = page.indexOf('/', 1);
    var dir = '';

    if (i_slash !== -1) {
        dir = page.substr(0, i_slash);

        try {
            if (permittedFolders.indexOf(fs.realpathSync('.' + dir)) === -1) {
                page = page.substr(i_slash);
            }
        } catch (e) {
        }
    }

    logger.info(dir === '' ? page : dir + '   ' + page);

    var i_dot = page.lastIndexOf('.');
    i_slash = page.lastIndexOf('/');
    var extension = '';

    if (i_dot !== -1 && i_dot > i_slash)    {
        extension = page.substr(i_dot);
    }

    if (dir === '' && page === '') {
        res.writeHead(302, {
            Location: config.redirect.replace(/\/+$/, '') + '/'
        });
        res.end();
    } else if (dir === '') {
        if (!lastSlash) {
            res.writeHead(302, {
                Location: page.substr(1) + '/'
            });
            res.end();
        } else {
            responseWriter.serve(res, appRoot + '/other/index.htm', 'text/html');
        }
    } else if (extension === '.htm') {
        if (dir === '') {
            responseWriter.serve(res, appRoot + page, 'text/html');
        } else {
            responseWriter.serve(res, appRoot + dir + '/conf' + page, 'text/html');
        }
    } else if (extension === '.config') {
        var urlParam = req.url.split('?');

        fileHelper.readFile(appRoot + dir + '/conf' + page, function (error, config) {
            if (!error) {
                config += '';

                if (urlParam.length === 2) {
                    var nameValue = urlParam[1].split('=');

                    if (nameValue.length === 2) {
                        if (nameValue[0].trim() === 'i') {
                            var value = parseInt(nameValue[1].trim());

                            if (!isNaN(value)) {
                                var expressions = config.match(/\$\{.*\}/g);
                                expressions = expressions == null ? [] : expressions;

                                for (var e = 0; e < expressions.length; e++) {
                                    var expr = expressions[e];

                                    config = config.replace(expr,
                                        Parser.parse(expr.substr(2, expr.length - 3).replace('i', '' + value)).evaluate({})
                                    );
                                }
                            }
                        } else if (nameValue[0].trim() === 'v') {
                            value = decodeURIComponent(nameValue[1]);

                            var optionLine = config.match(/v\s*=\s*\[[^\]]*\]/)[0];

                            var left = optionLine.indexOf('[');
                            var right = optionLine.indexOf(']');
                            var options = optionLine.substr(left + 1, right - left - 1).split(/\s*,\s*/);

                            expressions = config.match(/\$\{[^\}]*\}/g);
                            expressions = expressions == null ? [] : expressions;

                            for (e = 0; e < expressions.length; e++) {
                                expr = expressions[e];
                                var newExpr = expr.replace('v_index', '' + (options.indexOf(value) + 1));

                                config = config.replace(expr, newExpr);

                                var newNewExpr;

                                try {
                                    newNewExpr = Parser.parse(newExpr.substr(2, newExpr.length - 3).replace('v', value)).evaluate({});
                                } catch (err) {
                                    try {
                                        newNewExpr = newExpr.substr(2, newExpr.length - 3).replace('v', value);
                                    } catch (err) {
                                        newNewExpr = newExpr;
                                    }
                                }

                                config = config.replace(newExpr, newNewExpr);
                            }
                        }
                    }
                }

                var repeatLength = config.indexOf('[configuration]');
                repeatLength = repeatLength < 0 ? 0 : repeatLength;

                config = config.substr(repeatLength, config.length - repeatLength);

                responseWriter.write(res, 200, 'text/plain', config);
            } else {
                responseWriter.write(res, 500, 'text/plain');
            }
        });
    } else if (extension !== '') {
        var path = appRoot + page;
        responseWriter.serve(res, path, mime.lookup(path));
    } else if (page === '/api/v1/series/query') {
        var body = '';

        req.on('data', function (chunk) {
            body += chunk;
        });

        req.on('end', function () {
            cacher.handleRequest(body, function (error, cached, cachePath) {
                if (error) {
                    logger.error('Error', 'err %', error)
                    write(res, 400, 'application/json', null);
                } else {
                    if (cached) {
                        fileHelper.readFile(cachePath,function (data) {
                            responseWriter.serve(res, cachePath, 'application/json');
                        })
                    } else {
                        series.query(JSON.parse(body), function (error, response, data) {
                            responseWriter.write(res, 200, 'application/json', JSON.stringify(data));
                            fs.writeFileSync(cachePath, JSON.stringify(data));
                        })
                    }
                }
            });
        });

    } else if (page === '/full_index') {
        if (dirs.indexOf(dir) > -1) {
            logger.info('index exists for ' + dir);

            responseWriter.write(res, 200, 'application/json',
                JSON.stringify({
                    index: index[dir],
                    sequence: sequence[dir],
                    parameters: parameters[dir]
                })
            );
        } else {
            logger.info('creating index for ' + dir);

            configer.createIndex(dir, function (index, sequence, parameters) {
                responseWriter.write(res, 200, 'application/json',
                    JSON.stringify({
                        index: index,
                        sequence: sequence,
                        parameters: parameters
                    })
                );
            });
        }
    } else if (page === '/drop_index') {
        var i_dir = dirs.indexOf(dir);

        if (i_dir > -1) {
            dirs.splice(i_dir, 1);

            delete sequence[dir];
            delete index[dir];
            delete parameters[dir];
        }

        res.writeHead(200);
        res.end();
    } else {
        logger.info('not found at all: ' + page);
        res.writeHead(500);
        res.end();
    }
}

function startServer(properties) {
    var options = {
        url: properties.get('atsd.url'),
        user: properties.get('atsd.user'),
        password: properties.get('atsd.password')
    };

    var server = http.createServer(function (req, res) {
        setUpServer(req, res, options);
    });
    server.listen(config.port);
}

function startApp() {
    var properties = null;
    var propertiesFile;
    logger.info('Trying to get properties')
    if (process.argv.size > 2) {
        if (argv[3][0] !== '/') {
            propertiesFile = __dirname + '/' + argv[3];
        } else {
            propertiesFile = __dirname + argv[3];
        }

    } else {
        propertiesFile = appRoot + '/atsd.properties'
    }
    logger.info('Using properties file: ' + propertiesFile + '\n');
    if (fileHelper.checkPath(propertiesFile)) {
        startServer(PropertiesReader(propertiesFile));
    } else {
        logger.info('Properties file doesn\'t exist');
        logger.info('Closing applictation');
    }
}

startApp();

