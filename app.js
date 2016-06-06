var http = require('http');
var url = require('url');
var _ = require('lodash');
var fs = require('node-fs');
var crypto = require('crypto');
var mime = require('mime');
var Series = require('../atsd-api-nodejs').Series;
var path = require('fs');
var async = require('./js/async');
var Parser = require('./js/parser').Parser;
var appRoot = require('app-root-path');
var PropertiesReader = require('properties-reader');


var config = require('./config');

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
                    config['group'][config['group'].length - 1]++;

                    if (config.hasOwnProperty('widget')) {
                        config['widget'].push('[widget]\n');
                    } else {
                        config['widget'] = ['[widget]\n'];
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
            if (type === 'else') {

            } else if (type === 'configuration') {
                var nameValue = lineTrimmed.split('=');

                if (nameValue.length === 2) {
                    config[type][nameValue[0].trim()] = nameValue[1].trim();
                }
            } else if (type === 'widget' || type === 'group') {
                var widgets = config['widget'];
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

    return config;
}

var sequence = {};
var index = {};
var parameters = {};

var dirs = [];

function getConfig(path, callback) {
    var urlParam = path.split('?');

    if (urlParam.length < 3) {
        fs.readFile('.' + urlParam[0], function (error, config) {
            if (!error) {
                config += '';

                if (urlParam.length === 2) {
                    var nameValue = urlParam[1].split('=');

                    if (nameValue.length === 2) {
                        if (nameValue[0].trim() === 'i') {
                            var value = parseInt(nameValue[1].trim());

                            if (!isNaN(value)) {
                                var expressions = config.match(/\$\{[^\}]*\}/g);
                                expressions = expressions == null ? [] : expressions;

                                for (var e = 0; e < expressions.length; e++) {
                                    var expr = expressions[e];

                                    config = config.replace(expr,
                                        Parser.parse(expr.substr(2, expr.length - 3).replace('i', '' + value)).evaluate({})
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
                            expressions = expressions == null ? [] : expressions;

                            for (e = 0; e < expressions.length; e++) {
                                expr = expressions[e];
                                var newExpr = expr.replace('v_index', '' + (options.indexOf(value) + 1));

                                config = config.replace(expr, newExpr);

                                var newNewExpr;

                                try {
                                    newNewExpr = Parser.parse(newExpr.substr(2, newExpr.length - 3).replace('v', value)).evaluate({});
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

                callback(config)
            } else {
                console.log(error);
            }
        });
    }
}

function getTitle(path, callback) {
    if (/^.*\.config/.test(path)) {
        getConfig(path, function (config) {
            if (config === '') return;

            var title = parseConfig(config).configuration !== undefined ? parseConfig(config).configuration.title : '';

            callback('', {
                path: path,
                title: title
            });
        });
    } else if (/^.*\.htm/.test(path) || /^.*\.html/.test(path)) {
        getConfig(path, function (config) {
            if (config === '') return;

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
    try {
        var index = [];

        function getPages(fullPath) {
            var pathParts = fullPath.split('/');
            var path = pathParts[pathParts.length - 1];
            var paths = [];

            var lines = ('' + fs.readFileSync(fullPath)).split('\n');

            var single = true;

            for (var l = 0; l < lines.length; l++) {
                var line = lines[l].trim();

                if (/^\[.*\]/.test(line) && line !== '[repeat]') {
                    break;
                }

                if (/^i *= *.*\.\..*/.test(line)) {
                    var nameValue = line.split('=');
                    if (nameValue.length !== 2) break;

                    var startEnd = nameValue[1].split('..');
                    if (startEnd.length !== 2) break;

                    var start = parseInt(startEnd[0].trim());
                    var end = parseInt(startEnd[1].trim());

                    if (isNaN(start) || isNaN(end) || start > end) break;

                    single = false;

                    for (var i = start; i <= end; i++) {
                        paths.push(path + '?i=' + i);
                    }

                    break;
                } else if (/^v *= *\[.*\]/.test(line)) {
                    nameValue = line.split('=');
                    if (nameValue.length !== 2) break;

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

        var confDir = '.' + dir + '/conf/';
        var sections = fs.readdirSync(confDir);

        for (var s = 0; s < sections.length; s++) {
            var section = sections[s];

            if (fs.lstatSync(confDir + section).isDirectory()) {
                index.push({
                    folder: section,
                    pages: []
                });

                var pages = fs.readdirSync(confDir + section);

                for (var p = 0; p < pages.length; p++) {
                    var allPages = getPages(confDir + section + '/' + pages[p]);

                    for (var pp = 0; pp < allPages.length; pp++) {
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
        console.log(err);
        callback([]);
    }
}

function loadIndex(titleIndex, dir, callback) {
    fs.readFile(appRoot + dir + '/index.config', function (error_index, clIndex) {
        fs.readFile(appRoot + dir + '/param.config', function (error_config, config) {
            index[dir] = [];
            sequence[dir] = [];
            parameters[dir] = {};

            var lines = ('' + config).split('\n');

            for (var l = 0; l < lines.length; l++) {
                var line = lines[l].trim();

                if (line === '') continue;

                var nameValue = line.split('=');

                if (nameValue.length === 2) {
                    parameters[dir][nameValue[0].trim()] = nameValue[1].trim();
                }
            }

            lines = ('' + clIndex).split('\n');

            var pageMode = true;

            for (l = 0; l < lines.length; l++) {
                line = lines[l].trim();

                if (line === '') continue;

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

                                for (var href in titleIndex) {
                                    if (!titleIndex.hasOwnProperty(href)) continue;

                                    if (
                                        href === hrefBase
                                        || (href.length > hrefBase.length
                                        && href.substr(0, hrefBase.length) === hrefBase
                                        && href[hrefBase.length] === '?')
                                    ) {
                                        index[dir].push({
                                            href: href,
                                            title: ''
                                        });
                                    }
                                }
                            }
                        } else {
                            var section = index[dir][index[dir].length - 1];

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
    getIndex(dir, function (fileIndex) {
        if (fileIndex === '') return;

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

        async.map(paths, getTitle, function (err, paths) {
            var titleByPath = {};

            for (var t = 0; t < paths.length; t++) {
                var entry = paths[t];
                titleByPath[entry.path] = entry.title;
            }

            for (var section in titleIndex) {
                if (!titleIndex.hasOwnProperty(section)) continue;

                if (typeof titleIndex[section] !== 'string') {
                    for (var page in titleIndex[section]) {
                        if (!titleIndex[section].hasOwnProperty(page)) continue;

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

var realDir = fs.realpathSync(appRoot.toString());
var realConfig = fs.realpathSync(appRoot + '/config.js');

function realPaths(paths) {
    for (var i = 0; i < paths.length; i++) {
        try {
            paths[i] = fs.realpathSync(paths[i]);
        } catch (e) {
            paths[i] = null;
        }
    }

    return paths
}

var permittedFolders = realPaths(config.permitted_folders);
var allPermittedFolders = realPaths(config.config_folders).concat(permittedFolders).concat(realPaths([config.data_folder]));

var checkPath = exports.checkPath = function checkPath(filePath) {
    return path.existsSync(filePath);
};

function readFile(path, callback) {
    if (checkPath(path)) {
        fs.readFile(path, callback);
    } else {
        callback(new Error('invalid path'));
    }
}

function setUpServer(req, res, options) {
    var series = new Series(options);
    function write(statusCode, contentType, content) {
        res.writeHead(statusCode, {'Content-Type': contentType});

        if (statusCode === 200) {
            res.end(content, 'utf-8');
        } else {
            res.end();
        }
    }

    function serve(page, contentType) {
        readFile(page, function (error, content) {
            if (!error) {
                write(200, contentType, content);
            } else {
                console.log('file not found: ' + page + '\n' + error);
                write(500, contentType);
            }
        });
    }

    var page = url.parse(req.url).pathname;
    console.log("Requested page" + page);

    var lastSlash = false;
    if (page[page.length - 1] === '/') {
        lastSlash = true;
    }

    page = page.replace(/\/+$/, '');

    console.log(new Date().toISOString() + ' ' + page);

    var i_slash = page.indexOf('/', 1);
    var dir = '';

    if (i_slash !== -1) {
        dir = page.substr(0, i_slash);

        try {
            if (permittedFolders.indexOf(fs.realpathSync('.' + dir)) === -1) {
                page = page.substr(i_slash);
            }
        } catch (e) {
        }
    }

    console.log(dir === '' ? page : dir + '   ' + page);

    var i_dot = page.lastIndexOf('.');
    i_slash = page.lastIndexOf('/');
    var extension = '';

    if (i_dot !== -1 && i_dot > i_slash) {
        extension = page.substr(i_dot);
    }

    if (dir === '' && page === '') {
        res.writeHead(302, {
            Location: config.redirect.replace(/\/+$/, '') + '/'
        });
        res.end();
    } else if (dir === '') {
        if (!lastSlash) {
            res.writeHead(302, {
                Location: page.substr(1) + '/'
            });
            res.end();
        } else {
            serve(appRoot + '/other/index.htm', 'text/html');
        }
    } else if (extension === '.htm') {
        if (dir === '') {
            serve(appRoot + page, 'text/html');
        } else {
            serve(appRoot + dir + '/conf' + page, 'text/html');
        }
    } else if (extension === '.config') {
        var urlParam = req.url.split('?');

        readFile(appRoot + dir + '/conf' + page, function (error, config) {
            if (!error) {
                config += '';

                if (urlParam.length === 2) {
                    var nameValue = urlParam[1].split('=');

                    if (nameValue.length === 2) {
                        if (nameValue[0].trim() === 'i') {
                            var value = parseInt(nameValue[1].trim());

                            if (!isNaN(value)) {
                                var expressions = config.match(/\$\{.*\}/g);
                                expressions = expressions == null ? [] : expressions;

                                for (var e = 0; e < expressions.length; e++) {
                                    var expr = expressions[e];

                                    config = config.replace(expr,
                                        Parser.parse(expr.substr(2, expr.length - 3).replace('i', '' + value)).evaluate({})
                                    );
                                }
                            }
                        } else if (nameValue[0].trim() === 'v') {
                            value = decodeURIComponent(nameValue[1]);

                            var optionLine = config.match(/v\s*=\s*\[[^\]]*\]/)[0];

                            var left = optionLine.indexOf('[');
                            var right = optionLine.indexOf(']');
                            var options = optionLine.substr(left + 1, right - left - 1).split(/\s*,\s*/);

                            expressions = config.match(/\$\{[^\}]*\}/g);
                            expressions = expressions == null ? [] : expressions;

                            for (e = 0; e < expressions.length; e++) {
                                expr = expressions[e];
                                var newExpr = expr.replace('v_index', '' + (options.indexOf(value) + 1));

                                config = config.replace(expr, newExpr);

                                var newNewExpr;

                                try {
                                    newNewExpr = Parser.parse(newExpr.substr(2, newExpr.length - 3).replace('v', value)).evaluate({});
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

                write(200, 'text/plain', config);
            } else {
                write(500, 'text/plain');
            }
        });
    } else if (extension !== '') {
        var path = appRoot + page;
        serve(path, mime.lookup(path));
    } else if (page === '/api/v1/series/query') {
        var body = '';

        req.on('data', function (chunk) {
            body += chunk;
        });

        req.on('end', function () {
            // Cashing data
            var filename = crypto.createHash('md5');
            filename.update(body.toString());
            filename = config.data_folder + '/' + filename.digest('hex');

            try {
                if (fs.existsSync(filename)) {
                    console.log('taking from cache');

                    serve(filename, 'application/json');
                } else {
                    series.get(JSON.parse(body.toString()), function (error, response, data) {
                        data = JSON.stringify(data);

                        write(200, 'application/json', data);

                        console.log('dumping to cache');

                        if (!fs.existsSync(config.data_folder)) {
                            console.log('creating data folder: ' + config.data_folder);

                            fs.mkdirSync(config.data_folder, 511, true);
                        }

                        fs.writeFileSync(filename, data);
                    });
                }
            } catch (err) {
                write(200, 'application/json', '{}');
            }
        });
    } else if (page === '/full_index') {
        if (dirs.indexOf(dir) > -1) {
            console.log('index exists for ' + dir);

            write(200, 'application/json',
                JSON.stringify({
                    index: index[dir],
                    sequence: sequence[dir],
                    parameters: parameters[dir]
                })
            );
        } else {
            console.log('creating index for ' + dir);

            createIndex(dir, function (index, sequence, parameters) {
                write(200, 'application/json',
                    JSON.stringify({
                        index: index,
                        sequence: sequence,
                        parameters: parameters
                    })
                );
            });
        }
    } else if (page === '/drop_index') {
        var i_dir = dirs.indexOf(dir);

        if (i_dir > -1) {
            dirs.splice(i_dir, 1);

            delete sequence[dir];
            delete index[dir];
            delete parameters[dir];
        }

        res.writeHead(200);
        res.end();
    } else {
        console.log('not found at all: ' + page);
        res.writeHead(500);
        res.end();
    }
}

function startServer(properties) {
    var options = {
        url: properties.get('atsd.url'),
        user: properties.get('atsd.user'),
        password: properties.get('atsd.password')
    };
    
    var series = new Series(options);
    var server = http.createServer(function (req, res) {
        setUpServer(req,res, options);
    });
    server.listen(config.port);
}

function startApp() {
    var properties = null;
    var propertiesFile;
    console.log('Trying to get properties')
    if (process.argv.size > 2) {
        if (argv[3][0] !== '/') {
            propertiesFile = __dirname + '/' + argv[3];
        } else {
            propertiesFile = __dirname + argv[3];
        }

    } else {
        propertiesFile = appRoot + '/atsd.properties'
    }
    console.log('Using properties file: ' + propertiesFile + '\n');
    if (checkPath(propertiesFile)) {
        startServer(PropertiesReader(propertiesFile));
    } else {
        console.log('Properties file doesn\'t exist');
        console.log('Closing applictation');
    }
}

startApp();

