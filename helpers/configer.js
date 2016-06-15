'use strict';
var logger = require('npmlog');
var async = require('async');
var appRoot = require('app-root-path');
var fs = require('fs');
var Parser = require('./../public/js/parser').Parser;

var sequence = {};
var index = {};
var parameters = {};
var dirs = [];
exports.createIndex = createIndex;

function parseConfig(clConfig) {
    var types = [
        'configuration',
        'index',
        'text',
        'widget',
        'group'
    ];

    var config = {
        else: [],
        order: []
    };

    var lines = clConfig.split('\n');
    var type = 'else';

    for (var p = 0; p < lines.length; p++) {
        var line = lines[p];
        var lineTrimmed = line.trim();

        if (/^\[.*\]/.test(lineTrimmed) && types.indexOf(lineTrimmed.substr(1, lineTrimmed.length - 2)) > -1) {
            var possibleType = lineTrimmed.substr(1, lineTrimmed.length - 2);

            if (possibleType === 'configuration') {
                type = possibleType;

                config[type] = {};
            } else if (possibleType === 'group') {
                type = possibleType;
                config.order.push(type);

                if (config.hasOwnProperty(type)) {
                    config[type].push(0);
                } else {
                    config[type] = [0];
                }
            } else if (possibleType === 'widget') {
                if (type !== 'group') {
                    type = possibleType;
                    config.order.push(type);

                    if (config.hasOwnProperty(type)) {
                        config[type].push('[widget]\n');
                    } else {
                        config[type] = ['[widget]\n'];
                    }
                } else {
                    config.group[config.group.length - 1]++;

                    if (config.hasOwnProperty('widget')) {
                        config.widget.push('[widget]\n');
                    } else {
                        config.widget = ['[widget]\n'];
                    }
                }
            } else if (possibleType === 'index') {
                type = possibleType;
                config.order.push(type);

                if (config.hasOwnProperty(type)) {
                    config[type].push([]);
                } else {
                    config[type] = [[]];
                }
            } else if (possibleType === 'text') {
                type = possibleType;
                config.order.push(type);

                if (config.hasOwnProperty(type)) {
                    config[type].push([]);
                } else {
                    config[type] = [[]];
                }
            }
        } else {
            if (type !== 'else') {
                if (type === 'configuration') {
                    var nameValue = lineTrimmed.split('=');

                    if (nameValue.length === 2) {
                        config[type][nameValue[0].trim()] = nameValue[1].trim();
                    }
                } else if (type === 'widget' || type === 'group') {
                    var widgets = config.widget;
                    widgets[widgets.length - 1] += line + '\n';
                } else if (type === 'index') {
                    var indices = config[type];
                    var slideTitle = lineTrimmed.split('=');

                    if (slideTitle.length === 2) {
                        indices[indices.length - 1].push({
                            slide: parseInt(slideTitle[0].trim()),
                            title: slideTitle[1].trim()
                        });
                    }
                } else if (type === 'text') {
                    var texts = config[type];
                    var bsBullet = lineTrimmed.split('=');

                    if (bsBullet.length === 2) {
                        texts[texts.length - 1].push(bsBullet[1]);
                    }
                }
            }
        }
    }

    return config;
}

function getConfig(path, callback) {
    var urlParam = path.split('?');

    if (urlParam.length < 3) {
        fs.readFile('.' + urlParam[0], function(error, config) {
            if (!error) {
                config += '';

                if (urlParam.length === 2) {
                    var nameValue = urlParam[1].split('=');

                    if (nameValue.length === 2) {
                        var expressions;
                        var e;
                        var expr;
                        var value;
                        if (nameValue[0].trim() === 'i') {
                            value = parseInt(nameValue[1].trim());

                            if (!isNaN(value)) {
                                expressions = config.match(/\$\{[^\}]*\}/g);
                                expressions = expressions === null ? [] : expressions;

                                for (e = 0; e < expressions.length; e++) {
                                    expr = expressions[e];

                                    config = config.replace(expr,
                                        Parser
                                            .parse(expr.substr(2, expr.length - 3)
                                            .replace('i', value.toString()))
                                            .evaluate({})
                                    );
                                }
                            }
                        } else if (nameValue[0].trim() === 'v') {
                            value = nameValue[1];

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
                                var newExpr = expr.replace('v_index', (options.indexOf(value) + 1).toString());

                                config = config.replace(expr, newExpr);

                                var newNewExpr;

                                try {
                                    newNewExpr = Parser
                                        .parse(newExpr.substr(2, newExpr.length - 3)
                                        .replace('v', value.toString()))
                                        .evaluate({});
                                } catch (err) {
                                    try {
                                        newNewExpr = newExpr.substr(2, newExpr.length - 3).replace('v', value);
                                    } catch (err) {
                                        newNewExpr = newExpr;
                                    }
                                }

                                config = config.replace(newExpr, newNewExpr);
                            }
                        }
                    }
                }

                var repeatLength = config.indexOf('[configuration]');
                repeatLength = repeatLength < 0 ? 0 : repeatLength;

                config = config.substr(repeatLength, config.length - repeatLength);

                callback(config);
            } else {
                logger.info(error);
            }
        });
    }
}

function getTitle(path, callback) {
    if (/^.*\.config/.test(path)) {
        getConfig(path, function(config) {
            if (config === '') {
                return;
            }
            var title = parseConfig(config).configuration !== undefined ? parseConfig(config).configuration.title : '';

            callback('', {
                path: path,
                title: title
            });
        });
    } else if (/^.*\.htm/.test(path) || /^.*\.html/.test(path)) {
        getConfig(path, function(config) {
            if (config === '') {
                return;
            }
            var title = '';
            var titles = config.match(/<title>.*<\/ *title>/g);

            if (titles.length > 0) {
                var start = titles[0].indexOf('>') + 1;
                var end = titles[0].substr(start).indexOf('<');

                title = titles[0].substr(start, end);
            }

            callback('', {
                path: path,
                title: title
            });
        });
    }
}

function getIndex(dir, callback) {
    function getPages(fullPath) {
        var pathParts = fullPath.split('/');
        var path = pathParts[pathParts.length - 1];
        var paths = [];

        var lines = (fs.readFileSync(fullPath)).toString().split('\n');

        var single = true;

        for (var l = 0; l < lines.length; l++) {
            var line = lines[l].trim();

            if (/^\[.*\]/.test(line) && line !== '[repeat]') {
                break;
            }
            var nameValue;
            if (/^i *= *.*\.\..*/.test(line)) {
                nameValue = line.split('=');
                if (nameValue.length !== 2) {
                    break;
                }

                var startEnd = nameValue[1].split('..');
                if (startEnd.length !== 2) {
                    break;
                }

                var start = parseInt(startEnd[0].trim());
                var end = parseInt(startEnd[1].trim());

                if (isNaN(start) || isNaN(end) || start > end) {
                    break;
                }

                single = false;

                for (var i = start; i <= end; i++) {
                    paths.push(path + '?i=' + i);
                }

                break;
            } else if (/^v *= *\[.*\]/.test(line)) {
                nameValue = line.split('=');
                if (nameValue.length !== 2) {
                    break;
                }

                single = false;

                var value = nameValue[1].trim();
                value = value.substr(1, value.length - 2);

                var options = value.split(',');

                for (var o = 0; o < options.length; o++) {
                    paths.push(path + '?v=' + options[o].trim());
                }

                break;
            }
        }

        if (single) {
            paths.push(path);
        }

        return paths;
    }

    try {
        var index = [];
        var confDir = '.' + dir + '/conf/';
        var sections = fs.readdirSync(confDir);

        for (var s = 0; s < sections.length; s++) {
            var section = sections[s];
            var allPages;
            var p;
            var pp;
            if (fs.lstatSync(confDir + section).isDirectory()) {
                index.push({
                    folder: section,
                    pages: []
                });

                var pages = fs.readdirSync(confDir + section);

                for (p = 0; p < pages.length; p++) {
                    allPages = getPages(confDir + section + '/' + pages[p]);

                    for (pp = 0; pp < allPages.length; pp++) {
                        index[index.length - 1].pages.push(allPages[pp]);
                    }
                }
            } else {
                allPages = getPages(confDir + section);

                for (pp = 0; pp < allPages.length; pp++) {
                    index.push(allPages[pp]);
                }
            }
        }

        callback(index);
    } catch (err) {
        logger.info(err);
        callback([]);
    }
}

function loadIndex(titleIndex, dir, callback) {
    fs.readFile(appRoot + dir + '/index.config', function(errorIndex, clIndex) {
        fs.readFile(appRoot + dir + '/param.config', function(errorConfig, config) {
            index[dir] = [];
            sequence[dir] = [];
            parameters[dir] = {};

            var lines = config.toString().split('\n');
            var line;
            var section;
            var href;
            for (var l = 0; l < lines.length; l++) {
                line = lines[l].trim();

                if (line === '') {
                    continue;
                }

                var nameValue = line.split('=');

                if (nameValue.length === 2) {
                    parameters[dir][nameValue[0].trim()] = nameValue[1].trim();
                }
            }

            lines = clIndex.toString().split('\n');

            var pageMode = true;
            for (l = 0; l < lines.length; l++) {
                line = lines[l].trim();
                if (line === '') {
                    continue;
                }
                if (/^\[.*\]/.test(line)) {
                    if (line === '[section]') {
                        index[dir].push({
                            title: '',
                            collapse: false,
                            folder: '',
                            pages: []
                        });

                        pageMode = false;
                    } else if (line === '[page]') {
                        pageMode = true;
                    }
                } else {
                    var slideTitle = line.split('=');

                    if (slideTitle.length === 2) {
                        var param = slideTitle[0].trim();

                        if (pageMode) {
                            if (param === 'file') {
                                var hrefBase = slideTitle[1].trim();

                                for (href in titleIndex) {
                                    if (!titleIndex.hasOwnProperty(href)) {
                                        continue;
                                    }
                                    if (href === hrefBase || (href.length > hrefBase.length &&
                                        href.substr(0, hrefBase.length) === hrefBase &&
                                        href[hrefBase.length] === '?')
                                    ) {
                                        index[dir].push({
                                            href: href,
                                            title: ''
                                        });
                                    }
                                }
                            }
                        } else {
                            section = index[dir][index[dir].length - 1];

                            if (param === 'title') {
                                section.title = slideTitle[1].trim();
                            } else if (param === 'collapse') {
                                section.collapse = (slideTitle[1].trim() === 'true');
                            } else if (param === 'folder') {
                                section.folder = slideTitle[1].trim();
                            }
                        }
                    }
                }
            }

            for (var i = 0; i < index[dir].length; i++) {
                section = index[dir][i];

                if (section.folder !== undefined) {
                    var folder = section.folder;
                    var pages = titleIndex[folder];

                    if (pages !== undefined) {
                        var titles = [];

                        for (href in pages) {
                            if (pages.hasOwnProperty(href)) {
                                titles.push({
                                    href: href,
                                    title: pages[href]
                                });

                                sequence[dir].push(href);
                            }
                        }

                        section.pages = titles;
                    }
                } else {
                    sequence[dir].push(section.href);

                    var title = titleIndex[section.href];

                    if (title !== undefined) {
                        section.title = title;
                    }
                }
            }

            dirs.push(dir);
            callback(index[dir], sequence[dir], parameters[dir]);
        });
    });
}

function createIndex(dir, callback) {
    getIndex(dir, function(fileIndex) {
        if (fileIndex === '') {
            return;
        }
        var titleIndex = {};
        var paths = [];

        for (var s = 0; s < fileIndex.length; s++) {
            var section = fileIndex[s];

            if (section.folder !== undefined) {
                var pages = section.pages;

                titleIndex[section.folder] = [];

                for (var p = 0; p < pages.length; p++) {
                    var path = section.folder + '/' + pages[p];

                    titleIndex[section.folder][path] = '';

                    paths.push(dir + '/conf/' + path);
                }
            } else {
                titleIndex[section] = '';

                paths.push(dir + '/conf/' + section);
            }
        }

        async.map(paths, getTitle, function(err, paths) {
            var titleByPath = {};

            for (var t = 0; t < paths.length; t++) {
                var entry = paths[t];
                titleByPath[entry.path] = entry.title;
            }

            for (var section in titleIndex) {
                if (!titleIndex.hasOwnProperty(section)) {
                    continue;
                }
                if (typeof titleIndex[section] !== 'string') {
                    for (var page in titleIndex[section]) {
                        if (!titleIndex[section].hasOwnProperty(page)) {
                            continue;
                        }
                        titleIndex[section][page] = titleByPath[dir + '/conf/' + page];
                    }
                } else {
                    titleIndex[section] = titleByPath[dir + '/conf/' + section];
                }
            }

            loadIndex(titleIndex, dir, callback);
        });
    });
}
