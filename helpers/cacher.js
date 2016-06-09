'use strict';
var crypto = require('crypto');
var urlHelper = require('./url-helper');
var dataHelper = require('./date-helper');
var logger = require('npmlog');
var fs = require('fs');
var write = require('./response-writer').write;
var serve = require('./response-writer').serve;
exports.Cacher = Cacher;

function Cacher(cacheFolder) {
    Cacher.cahcheFolder = cacheFolder;
}

Cacher.prototype.handleRequest = function (body, callback) {

    // Cashing data
    var filename = crypto.createHash('md5');
    filename.update(body.toString());
    filename = Cacher.cahcheFolder + '/' + filename.digest('hex');
    var currentYear = new Date().getFullYear();

    var referrerYear = 2016;

    if (currentYear === referrerYear) {
        filename += dataHelper.dayOfCurrentYear();

    }
    logger.info('cache', 'filename %j', filename);

    try {
        if (fs.existsSync(filename)) {
            logger.info('cache', 'taking from cache %j', filename);
            callback(null, true, filename);
        } else {
            logger.info('caching', 'path: %j', filename);

            if (!fs.existsSync(Cacher.cahcheFolder)) {
                logger.info('creating data folder: ' + Cacher.cahcheFolder);

                fs.mkdirSync(Cacher.cahcheFolder, 511, true);
            }
            callback(null, false, filename);
        }

    } catch (err) {
        throw err;
        callback(err, false.filename);
    }
};

