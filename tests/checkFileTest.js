'use strict';

var chai = require('chai');
var fileHelper = require('../helpers/file-helper');
var expect = chai.expect;
var appRoot = require('app-root-path');

describe('File Function', function() {

    it('app file exist', function() {
        var path = appRoot + '/public/index.htm';
        expect(fileHelper.checkPath(path)).equal(true);
    });

    it('read properties correctly', function() {
        expect(fileHelper.readApiOptions).to.be.not.undefined;
        var options = fileHelper.readApiOptions();
        expect(options).to.be.not.undefined;
        expect(options).to.be.a('object');
        expect(options).to.have.property('url');
        expect(options).to.have.property('user');
        expect(options).to.have.property('password');
    });
});
