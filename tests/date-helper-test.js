'use strict';
var dateHelper = require('../helpers/date-helper');
var chai = require('chai');
var expect = chai.expect;

describe('DateHelper test', function() {
    it('dayOfCurrentYear', function() {
        var value = dateHelper.dayOfCurrentYear();
        expect(value).to.satisfy(function(num) {
            return num > 0;
        });
        expect(value).to.satisfy(function(num) {
            return num <= 366;
        });
        expect(value).to.be.a('number');
    });

});
