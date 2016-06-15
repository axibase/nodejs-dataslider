'use strict';var express = require('express');var fs = require('fs');var Cacher = require('../helpers/cacher').Cacher;var logger = require('npmlog');var Series = require('atsd-api').Series;var fileHelper = require('../helpers/file-helper');var config = require('../config');var bodyParser = require('body-parser');var multer = require('multer'); // v1.0.5var upload = multer();module.exports = (function() {    var api = express.Router();    var options = fileHelper.readApiOptions();    var series = new Series(options);    var cache = new Cacher(config.cacheOptions);    api.use(bodyParser.json()); // for parsing apilication/json    api.use(bodyParser.urlencoded({extended: true})); // for parsing apilication/x-www-form-urlencoded    api.post('/series', upload.array(), function(req, res, cachePath) {        console.log(cachePath);        cache.cache(req, function(err, cached, cachePath) {            if (err) {                logger.error('Cache error: ', '%j', err);                throw err;            }            if (cached) {                fs.readFile(cachePath, function(err, data) {                    if (err) {                        logger.log('Cache error', 'Failed to read cache data. Thrown error: %j', err);                        res.sendStatus(500);                    }else {                        res.json(JSON.parse(data.toString()));                    }                });            } else {                series.query(req.body, function(error, response, data) {                    if (error) {                        logger.error(err);                        res.sendStatus(400);                    }                    fs.writeFile(cachePath, JSON.stringify(data), function(err) {                        if (err) {                            logger.error('Cache :', 'Failed to write cache data %j on path %j. Thrown error %j',                                data,                                cachePath,                                err                            );                        }                        res.json(data);                    });                });            }        });    });    return api;})();