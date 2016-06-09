'use strict';
var fs = require('fs');


exports.checkPath = checkPath;
exports.readFile = readFile;


function checkPath(filePath) {
    return fs.existsSync(filePath);
}

function readFile(path, callback) {
    if (checkPath(path)) {
        fs.readFile(path, callback);
    } else {
        callback(new Error('invalid path ' + path));
    }
}
