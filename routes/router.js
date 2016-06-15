'use strict';

var config = require('../config');
var express = require('express');
var appRoot = require('app-root-path');
var logger = require('npmlog');
var configer = require('../helpers/configer');
var templateConfiger = require('../helpers/config-templater');

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
        router.get('/' + configDir + '/', function(req, res) {
            if (req.url.substr(-1) !== '/' && req.url.length > 1) {
                res.redirect(req.url +  '/');
            } else {
                res.sendFile(appRoot + '/public/index.htm');
            }
        });

        router.get('/' + configDir + '/title.htm', function(req, res) {
            res.sendFile(appRoot + '/public/' + configDir + '/conf/title.htm');
        });

        router.get('/' + configDir + '/full_index', function(req, res) {
            var dir = '/public/' + configDir;
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
            templateConfiger.translate(req, configDir, function(config) {
                res.send(config);
            });
        });
    });
    return router;
})();
