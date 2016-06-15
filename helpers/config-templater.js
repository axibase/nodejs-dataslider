'use strict';
var url = require('url');
var appRoot = require('app-root-path');
var fileHelper = require('../helpers/file-helper');
var Parser = require('../public/js/parser').Parser;

exports.translate = configRequest;

function oldTranslate(config, v, i, callback) {
    config += '';

    if (v || i) {
        var expressions = config.match(/\$\{[^\}]*\}/g);
        var e = 0;
        var expr = null;
        if (i) {
            expressions = expressions === null ? [] : expressions;
            for (e = 0; e < expressions.length; e++) {
                expr = expressions[e];

                config = config.replace(expr,
                    Parser.parse(expr.substr(2, expr.length - 3).replace('i', i.toString())).evaluate()
                );
            }
        } else if (v) {
            var optionLine = config.match(/v *= *\[[^\]]*\]/)[0];
            var left = optionLine.indexOf('[');
            var right = optionLine.indexOf(']');

            var options = optionLine.substr(left + 1, right - left - 1).split(',');
            for (var o = 0; o < options.length; o++) {
                options[o] = options[o].trim();
            }

            expressions = config.match(/\$\{[^\}]*\}/g);
            expressions = expressions === null ? [] : expressions;

            for (e = 0; e < expressions.length; e++) {
                expr = expressions[e];
                var newExpr = expr.replace('v_index', (options.indexOf(v) + 1).toString());

                config = config.replace(expr, newExpr);

                var newNewExpr;

                try {
                    newNewExpr = Parser.parse(newExpr.substr(2, newExpr.length - 3).replace('v', v)).evaluate({});
                } catch (err) {
                    try {
                        newNewExpr = newExpr.substr(2, newExpr.length - 3).replace('v', v);

                    } catch (err) {
                        newNewExpr = newExpr;
                    }
                }
                config = config.replace(newExpr, newNewExpr);
            }
        }
    }

    var repeatLength = config.indexOf('[configuration]');
    repeatLength = repeatLength < 0 ? 0 : repeatLength;

    config = config.substr(repeatLength, config.length - repeatLength);

    callback(config);
}

function configRequest(req, value, callback) {
    var path = url.parse(req.url).pathname;
    var configLocation = path.split(value)[1];
    var filePath = appRoot + '/public/' + value + '/conf' + configLocation;
    var v = req.query.v;
    var i = req.query.i;
    fileHelper.readFile(filePath, function(error, config) {
        oldTranslate(config, v, i, function(data) {
            callback(data);
        });
    });
}
