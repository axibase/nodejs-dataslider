'use strict';

var chai = require('chai');
var server = require('../helpers/file-helper');
var expect = chai.expect;
var appRoot = require('app-root-path');

describe('File Function', function() {

    it('app file exist', function() {
        var path = appRoot + '/other/index.htm';
        expect(server.checkPath(path)).equal(true);
    });
});
