'use strict';
var logger = require('npmlog');
var fs = require('fs');
var urlHelper = require('./url-helper');
var hash = require('object-hash');

exports.Cacher = Cacher;

function Cacher(options) {
    this._cacheFolder = options.cacheFolder;
    this._ttl = options.ttl;
}

Cacher.prototype.cache = function(req, callback) {
    var _this = this;
    var body = req.body;
    // Cashing data
    var filename = _this._cacheFolder + '/' + hash(req.originalUrl) + hash(body);
    var currentYear = new Date().getFullYear();
    var referrerYear = urlHelper.refererYear(req.header('referer'));
    logger.info('cache', 'filename %j', filename);
    fs.access(filename, fs.F_OK, function(err) {
        if (err) {
            fs.access(_this._cacheFolder, fs.F_OK, function(err) {
                if (err) {
                    logger.info('creating data folder: ' + _this._cacheFolder);
                    fs.mkdir(_this._cacheFolder, 511, function(err) {
                        if (err) {
                            logger.error('Cache: ', 'failed to create cache folder %j! %j', _this._cacheFolder, err);
                            throw err;
                        }
                        callback(err, false, null);
                    });
                }
                callback(null, false, filename);
            });
        } else {
            fs.stat(filename, function(err, stats) {
                if (err) {
                    logger.error('Cache', 'failed to get filestats of file %j with error %j', stats, err);
                    throw  err;
                }
                var liveTime = new Date().getTime() - new Date(stats.mtime).getTime();
                logger.info('Cache', 'File %j live Time: %j s.', filename, liveTime / 1000);
                if (liveTime > (_this._ttl * 1000) && (referrerYear === currentYear)) {
                    logger.info('cache', 'ttl is expired for file %j', filename);
                    callback(null, false, filename);

                } else {
                    logger.info('cache', 'taking from cache %j', filename);
                    callback(null, true, filename);
                }
            });

        }
    });

};

