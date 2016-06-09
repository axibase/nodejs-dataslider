'use strict';
var urlHelper = require('../helpers/url-helper');
var chai = require('chai');
var expect = chai.expect;

describe('DateHelper test', function() {
    it('dayOfCurrentYear', function() {
        var url = 'http://apps.axibase.com/slider/energinet-2016/?slide=2';
        expect(urlHelper.refererYear).to.be.not.undefined;
        var year = urlHelper.refererYear(url);
        expect(year).to.be.a('number');
        expect(year).equal(2016);
    });


    it('dayOfCurrentYear', function() {
        var url = 'http://localhost/';
        expect(urlHelper.refererYear).to.be.not.undefined;
        var year = urlHelper.refererYear(url);
        expect(year).to.be.a('number');
        expect(year).to.be.NaN;
    });

    it('dayOfCurrentYear', function() {
        var url = undefined;
        expect(urlHelper.refererYear).to.be.not.undefined;
        var year = urlHelper.refererYear(url);
        expect(year).to.be.a('number');
        expect(year).to.be.NaN;
    });

});
