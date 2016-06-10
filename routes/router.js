'use strict';

var config = require('../config');
var express = require('express');
var appRoot = require('app-root-path');
var logger = require('npmlog');
var configer = require('../helpers/configer');
var url = require('url');
var fileHelper = require('../helpers/file-helper');
var Parser = require('../public/js/parser');

function configRequest(req, value, callback) {
    var path = url.parse(req.url).pathname;
    var configLocation = path.split(value)[1];
    var filePath = appRoot + '/' + value + '/.conf' + configLocation;
    var v = req.query.v;
    var i = req.query.i;
    fileHelper.readFile(filePath, function(error, config) {
        config += '';
        var expressions;
        var counter = 0;
        if (i) {
            expressions = config.match(/\$\{.*\}/g);
            expressions = expressions === null ? [] : expressions;
            counter = 0;
            expressions.forEach(function (expr) {
                counter++;
                config = config.replace(expr,
                    Parser.parse(expr.substr(2, expr.length - 3).replace('i', '' + i)).evaluate({})
                );
            });
        } else if (v) {

            var optionLine = config.match(/v\s*=\s*\[[^\]]*\]/)[0];

            var left = optionLine.indexOf('[');
            var right = optionLine.indexOf(']');
            var options = optionLine.substr(left + 1, right - left - 1).split(/\s*,\s*/);

            expressions = config.match(/\$\{[^\}]*\}/g);
            expressions = expressions === null ? [] : expressions;
            counter = 0;
            expressions.forEach(function (expr) {
                var newExpr = expr.replace('v_index', '' + (options.indexOf(v) + 1));

                config = config.replace(expr, newExpr);

                var newNewExpr;

                try {
                    newNewExpr = Parser.parse(newExpr.substr(2, newExpr.length - 3).replace('v', v)).evaluate({});
                } catch (err) {
                    try {
                        newNewExpr = newExpr.substr(2, newExpr.length - 3).replace('v', v);
                    } catch (err) {
                        newNewExpr = newExpr;
                    }
                }
            });
        }

        var repeatLength = config.indexOf('[configuration]');
        repeatLength = repeatLength < 0 ? 0 : repeatLength;

        config = config.substr(repeatLength, config.length - repeatLength);

        callback(config);
    });
}

module.exports = (function() {
    var router = express.Router();
    router.get('/', function(req, res) {
        res.redirect(config.redirect);
    });

    var sequence = {};
    var index = {};
    var parameters = {};

    var dirs = [];

    config.configFolders.forEach(function(configDir) {
        router.get('/' + configDir + '?\/', function(req, res) {
            res.sendFile(appRoot + '/public/index.htm');
        });

        router.get('/' + configDir + '/title.htm', function(req, res) {
            res.sendFile(appRoot + '/' + configDir + '/conf/title.htm');
        });

        router.get('/' + configDir + '/full_index', function(req, res) {


            var dir = '/' + configDir;
            if (dirs.indexOf(dir) > -1) {
                logger.info('index exists for ' + dir);
                res.json({
                    index: index[dir],
                    sequence: sequence[dir],
                    parameters: parameters[dir]
                });
            } else {
                logger.info('creating index for ' + dir);

                configer.createIndex(dir, function(index, sequence, parameters) {
                    res.json({
                        index: index,
                        sequence: sequence,
                        parameters: parameters
                    });
                });
            }
        });

        router.get('/' + configDir + '/*.config', function(req, res) {
            configRequest(req, configDir, function(config) {
                res.send(config);
            });
        });
    });
    return router;
})();
