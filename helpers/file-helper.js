'use strict';
var fs = require('fs');
var appRoot = require('app-root-path');
var logger = require('npmlog');
var PropertiesReader = require('properties-reader');
exports.checkPath = checkPath;
exports.readFile = readFile;
exports.readApiOptions = readApiOptions;

function checkPath(filePath) {
    return fs.existsSync(filePath);
}

function readApiOptions() {
    var options = null;
    var propertiesFile = appRoot + '/atsd.properties';
    logger.info('API', 'Using properties file: %j', propertiesFile);
    try {
        if (checkPath(propertiesFile)) {
            var properties = PropertiesReader(propertiesFile);
            options = {
                url: properties.get('atsd.url'),
                user: properties.get('atsd.user'),
                password: properties.get('atsd.password')
            };
            return options;
        }
    } catch (e) {
        logger.info('Error', 'Error on reading api properties %j', e);
        throw e;
    }
    return options;
}

function readFile(path, callback) {
    if (checkPath(path)) {
        fs.readFile(path, callback);
    } else {
        callback(new Error('invalid path ' + path));
    }
}
