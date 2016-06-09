'use strict';

exports.dayOfCurrentYear = dayOfCurrentYear;

function dayOfCurrentYear() {
    var date = new Date();
    var currentYear = new Date(date.getFullYear(), 0, 0);
    var diff = date - currentYear;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
