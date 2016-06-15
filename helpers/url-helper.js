'use strict';

exports.refererYear = referrerYear;

function referrerYear(url) {
    if (!url) {
        return NaN;
    }
    var partsBySlash = url.split('/');
    if (partsBySlash.length > 2) {
        var preLastPart = partsBySlash[partsBySlash.length - 2];
        try {
            var splittedPart = preLastPart.split('-');
            var yearString = splittedPart[splittedPart.length - 1];
            return parseInt(yearString);
        }
        catch (e) {
            return NaN;
        }
    } else {
        return NaN;
    }
}
