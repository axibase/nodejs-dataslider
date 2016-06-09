'use strict';
var fileHelper = require('./file-helper');
var logger = require('npmlog');

exports.write = write;
exports.serve = serve;

function serve(res, page, contentType) {
    fileHelper.readFile(page, function(error, content) {
        if (!error) {
            write(res, 200, contentType, content);
        } else {
            logger.info('file not found: ' + page + '\n' + error);
            write(res, 500, contentType);
        }
    });
}

function write(response, statusCode, contentType, content) {
    response.writeHead(statusCode, {'Content-Type': contentType});
    if (statusCode === 200) {
        response.end(content, 'utf-8');
    } else {
        response.end();
    }
}
