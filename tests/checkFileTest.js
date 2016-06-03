var chai = require('chai');
var server = require('../app');
var expect = chai.expect;
var appRoot = require('app-root-path');

describe('File Function', function () {

    it('app file exist', function () {
        var path = appRoot + '/app.js';
        expect(server.checkPath(path)).equal(true);
    });
    
});
