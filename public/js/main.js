"use strict";
var isIE = !!document.documentMode;

var fixed = true;


/**
 * Root folder where application started
 * @param href
 * @returns {*}
 */
function getRootURL(href) {
    var slashPositions = [];
    for (var i = 0; i < href.length; i++) {
        if (href.charAt(i) === '/') {
            slashPositions.push(i);
        }
    }
    var count = slashPositions.length - 1;
    return (count > 2) ? href.substring(0, slashPositions[count - 1]) : null;
}

var rootUrl = getRootURL(window.location.href);


function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    };
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}

function parseConfig(clConfig) {
    var types = [
        'configuration',
        'index',
        'text',
        'html',
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
            } else if (possibleType === 'html') {
                type = possibleType;
                config.order.push(type);

                if (config.hasOwnProperty(type)) {
                    config[type].push([]);
                } else {
                    config[type] = [[]];
                }
            }
        } else {
            if (type === 'configuration') {
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
                bsBullet = [bsBullet.shift(), bsBullet.join('=')];

                if (bsBullet.length === 2 && bsBullet[0].trim() === 'bullet') {
                    texts[texts.length - 1].push(bsBullet[1]);
                }
            } else if (type === 'html') {
                var htmls = config[type];
                bsBullet = lineTrimmed.split('=');
                bsBullet = [bsBullet.shift(), bsBullet.join('=')];

                if (bsBullet.length === 2 && bsBullet[0].trim() === 'line') {
                    htmls[htmls.length - 1].push(bsBullet[1].trim());
                }
            }
        }
    }

    console.log(config);

    return config;
}

var slide = 0;
var sequence = [];
var sections = [];

function goToSlide(ind) {
    console.log('going to slide ' + ind);

    if (ind < 0 || ind >= sequence.length) {
        console.log(ind + ' of 0..' + (sequence.length - 1));
        return;
    }

    var path = sequence[ind];

    httpGetAsync(path, function (clConfig) {
        if (clConfig === '') return;

        var oldElem = $('#elem-' + slide);
        var newElem = $('#elem-' + ind);

        oldElem.removeClass('active');
        if (oldElem.parent().parent().hasClass('above')) {
            oldElem.parent().parent().removeClass('active');
        }

        newElem.addClass('active');
        if (newElem.parent().parent().hasClass('above')) {
            newElem.parent().parent().addClass('active');
        }

        oldElem = $('#side-' + slide);
        newElem = $('#side-' + ind);

        var oldCollapse = oldElem.parent().parent().parent();
        var newCollapse = newElem.parent().parent().parent();

        var oldHeader = oldCollapse.parent().children(':first-child').children(':first-child').children(':first-child');
        var newHeader = newCollapse.parent().children(':first-child').children(':first-child').children(':first-child');

        oldElem.removeClass('open');
        newElem.addClass('open').focus();

        if (oldCollapse.hasClass('panel-collapse')) {
            oldCollapse.removeClass('in').addClass('collapse').css("height", "0");
            oldHeader.removeClass('open');
        }

        if (newCollapse.hasClass('panel-collapse')) {
            newCollapse.removeClass('collapse').addClass('in').css("height", "auto");
            newHeader.addClass('open');
        }

        slide = ind;
        window.history.pushState("object or string", "", "?slide=" + (slide + 1));
        console.log('slide ' + (slide + 1) + ': ' + sequence[slide]);

        $('#page-number')
            .hide()
            .html('<input name="page" type="text" value="' + (slide + 1) + '"/> / ' + sequence.length)
            .fadeIn('fast');

        $('input[name="page"]')
            .keydown(function (e) {
                if (e.which == 13) { // enter
                    goToSlide(parseInt($('input[name="page"]').val()) - 1);
                }
            });

        $('#page-number-r')
            .hide()
            .html((slide + 1) + ' / ' + sequence.length)
            .fadeIn('fast');

        if (/^.*\.config/.test(path)) {
            var config = parseConfig(clConfig);

            loadWidgets(path, function (result) {

                config.widget = result;
                config.widget.contextpath = '';
                for (var i = 0; i < config.widget.length; i++) {
                    var w = config.widget[i];
                    for (var j = 0; j < w.series.length; j++) {
                        w.series[j].path = rootUrl + '/api/series';
                        w.series[j].contextpath = '';
                    }
                }
                var html = '';

                var g, w, i, t, h;
                g = w = i = t = h = 0;

                var widget;

                for (var e = 0; e < config.order.length; e++) {
                    if (config.order[e] === 'group') {
                        var group = config.group[g];

                        for (var ww = 0; ww < group; ww++) {
                            widget = config.widget[w];


                            html += '<div id=widget-' + w + ' align=center style="width: ' + (Math.floor(100 / group) - 1) + '%; height: auto"></div>\n';

                            w++;
                        }
                    } else if (config.order[e] === 'widget') {
                        widget = config.widget[w];


                        if (widget.type === 'table') {
                            html += '<div id=widget-' + w + ' align=center style="width:  50%; height: auto"></div>\n'
                        } else {
                            html += '<div id=widget-' + w + ' align=center style="width: 100%; height: auto"></div>\n';
                        }

                        w++;
                    } else if (config.order[e] === 'index') {
                        var index = config.index[i];

                        html += '<h3>';

                        for (var l = 0; l < index.length; l++) {
                            html += '<p><a href="javascript:goToSlide(' + index[l].slide + ');">' + index[l].title + '</a></p>';
                        }

                        html += '</h3>';

                        i++;
                    } else if (config.order[e] === 'text') {
                        var text = config.text[t];

                        html += '<ul style="list-style-type:disc"><h3>';

                        for (var b = 0; b < text.length; b++) {
                            html += '<li>' + text[b] + '</li>';
                        }

                        html += '</h3></ul>';

                        t++;
                    } else if (config.order[e] === 'html') {
                        var htm = config.html[h];

                        for (var hh = 0; hh < htm.length; hh++) {
                            html += htm[hh];
                        }

                        h++;
                    }
                }

                if (config.configuration !== undefined) {
                    if (config.configuration.title !== undefined) {
                        $('#title')
                            .hide()
                            .html(config.configuration.title)
                            .bigText()
                            .fadeIn('fast');

                        $('#title-r')
                            .hide()
                            .html(config.configuration.title)
                            .bigText()
                            .fadeIn('fast');

                        document.title = config.configuration.title;
                    }

                    if (config.configuration.footnote !== undefined) {
                        html += '<h3 align=center>' + config.configuration.footnote + '</h3>\n';
                    }
                }

                html += '<div style="width:100%; height: auto"></div>';

                $('#view')
                    .hide()
                    .html(html)
                    .fadeIn('fast');

                setTimeout(function () {
                    for (var ww = 0; ww < w; ww++) {
                        updateWidget(config.widget[ww], 'widget-' + ww);
                    }

                    resize();
                }, 0);

                for (var f = 0; f < 3; f++) {
                    $('#' + f).removeClass();
                }

                $('#' + slide).removeClass().addClass('active');
            });
        } else {
            var titles = ['title'];
            var title = '';

            if (titles.length > 0 && titles[0].innerText + '' !== 'undefined') {
                title = titles[0].innerText;
            } else {
                titles = clConfig.match(/<title>.*<\/ *title>/g);

                if (titles.length > 0) {
                    var start = titles[0].indexOf('>') + 1;
                    var end = titles[0].substr(start).indexOf('<');

                    title = titles[0].substr(start, end);
                }
            }

            $('#title')
                .hide()
                .html(title).bigText()
                .fadeIn('fast');

            $('#title-r')
                .hide()
                .html(title).bigText()
                .fadeIn('fast');

            document.title = title;

            $('#view')
                .hide()
                .html(clConfig)
                .fadeIn('fast')
                .thenResize();
        }
    });
}

function goToNextSection(ind) {
    var section = sections[ind];

    for (var s = ind; s < sections.length; s++) {
        if (sections[s] !== section) {
            goToSlide(sections[s]);
            break;
        }
    }

    if (s === sections.length && ind !== s - 1) {
        goToSlide(s - 1);
    }
}

function goToPreviousSection(ind) {
    var section = sections[ind];

    for (var s = ind; s >= 0; s--) {
        if (sections[s] !== section) {
            if (s === ind - 1) {
                goToSlide(sections[s]);
            } else {
                goToSlide(sections[s + 1]);
            }

            break;
        }
    }

    if (ind !== 0 && s === -1) {
        goToSlide(0);
    }
}

var frequency = 15000;
var interval = 0;

function goForward() {
    goToSlide((slide + 1) % sequence.length);
}

function play() {
    if (interval !== 0) {
        clearInterval(interval);
        interval = 0;
        $('#play').html('<span class="glyphicon glyphicon-play"></span>');
    } else {
        interval = setInterval("goForward()", frequency);
        $('#play').html('<span class="glyphicon glyphicon-stop"></span>');
    }
}

function makeSmall() {
    $('#navbar-top').css('display', 'none');
    $('#navbar-top-r').css('display', 'block');

    $('#navbar-bottom').css('display', 'none');
    $('#navbar-bottom-r').css('display', 'block');

    $('#slide-panel').css('display', 'none');
}

function makeBig() {
    $('#navbar-top').css('display', 'block');
    $('#navbar-top-r').css('display', 'none');

    $('#navbar-bottom').css('display', 'block');
    $('#navbar-bottom-r').css('display', 'none');

    var panel = $('#slide-panel');

    if (panel.hasClass("visible")) {
        panel.css('display', 'block');
    } else {
        panel.css('display', 'none');
    }
}

function resize() {
    if ($(window).width() <= 900) {
        makeSmall();

        $('#navbar-top-m').css('display', 'block');

        if (isIE) {
            $('.view')
                .css('margin-top', '25px')
                .css('margin-bottom', '25px');
        }
    } else {
        makeBig();

        if (fixed) {
            $('.footer').css('position', 'absolute');
            $('#navbar-top-m').css('display', 'none');
            $('#slide-panel').css('margin-top', '50px');

            if (isIE) {
                $('.view')
                    .css('margin-top', '75px')
                    .css('margin-bottom', '75px');
            }
        } else {
            $('.footer').css('position', 'relative');
            $('#navbar-top-m').css('display', 'block');
            $('#slide-panel').css('margin-top', '0');

            if (isIE) {
                $('.view')
                    .css('margin-top', '25px')
                    .css('margin-bottom', '25px');
            }
        }
    }

    $("#title").bigText();
    $("#title-r").bigText();

    selectWidgets().forEach(function (widget) {
        var size = resizeWidget.getDefaultSize(widget.config);
        var type = widget.config.type;

        if (type === 'Pie') {
            size.height = size.width;
        } else if (type === 'Chart') {
            size.height = size.width * 2 / 5;
        } else {
            size.height = size.width * 2 / 5;
        }

        size.height = Math.max(size.height, 200);

        resizeWidget(widget, size);
    });

    var body = $('body');
    var outerView = $('#outer-view');
    var view = $('#view');

    var bodyHeight = body.outerHeight(true);
    var viewHeight = !isIE ? view.outerHeight(true) : view.get(0).scrollHeight;

    if (isIE) {
        if ($(window).width() <= 900 || !fixed) {
            outerView.css('height', Math.max(viewHeight + 50, bodyHeight - 101)).scrollTop(0);
        } else {
            if (viewHeight + 150 > bodyHeight) {
                outerView.css('height', '').scrollTop(0);
            } else {
                outerView.css('height', bodyHeight).scrollTop(0);
            }
        }
    } else {
        if ($(window).width() <= 900 || !fixed) {
            outerView.css('height', Math.max(viewHeight, bodyHeight) - 101).scrollTop(0);
        } else {
            if (viewHeight > bodyHeight) {
                outerView.css('height', '').scrollTop(0);
            } else {
                outerView.css('height', bodyHeight).scrollTop(0);
            }
        }
    }
}

(function ($) {
    $.fn.extend({
        thenResize: function () {
            resize();
            return $(this);
        }
    });
})(jQuery);

function everythingElse() {
    $('#outer-view').on('change', resize);

    resize();

    var args = window.location.search.substring(1).split('&');

    var sl = 0;

    if (args.length > 0) {
        var nameValue = args[0].split('=');
        if (nameValue.length === 2 && nameValue[0] == 'slide') {
            sl = parseInt(nameValue[1]) - 1;
        }
    }

    httpGetAsync('full_index', function (index) {
        index = JSON.parse(index);

        console.log(index);

        sequence = index.sequence;
        fixed = index.parameters.fixed !== 'false';
        index = index.index;

        console.log(fixed);

        resize();

        var indexHTML = '';
        var ind;

        for (var i = 0; i < index.length; i++) {
            var section = index[i];

            var first;

            if (section.folder !== undefined) {
                first = sequence.indexOf(section.pages[0].href);

                for (var p = 0; p < section.pages.length; p++) {
                    sections.push(first);
                }
            } else {
                ind = sequence.indexOf(section.href);
                sections.push(ind);
            }

            indexHTML += '<div class="panel panel-default">';

            if (section.folder !== undefined) {
                indexHTML += '<div class="panel-heading">'
                    + '<h4 class="panel-title">'
                    + '<a data-toggle="collapse" data-parent="#accordion" href="#section-' + i + '">' + section.title + '</a>'
                    + '</h4>'
                    + '</div>'
                    + '<div id="section-' + i + '" class="panel-collapse collapse">'
                    + '<div class="panel-body">';

                for (p = 0; p < section.pages.length; p++) {
                    ind = sequence.indexOf(section.pages[p].href);
                    indexHTML += '<p><a id="side-' + ind + '" class="item" href="javascript:goToSlide(' + ind + ')">' + section.pages[p].title + '</a></p>';
                }

                indexHTML += '</div>'
                    + '</div>';
            } else {
                ind = sequence.indexOf(section.href);

                indexHTML += '<div class="panel-heading">'
                    + '<h4 class="panel-title">'
                    + '<a id="side-' + ind + '" href="javascript:goToSlide(' + ind + ')">' + section.title + '</a>'
                    + '</h4>'
                    + '</div>'
            }

            indexHTML += '</div>'
        }

        $("#accordion")
            .html(indexHTML);

        document.getElementById('fullscreen').onclick = function (argument) {
            var docelem = document.documentElement;

            if (docelem.requestFullscreen) {
                console.log('requestFullscreen');

                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    docelem.requestFullscreen();
                }
            } else if (docelem.mozRequestFullScreen) {
                console.log('mozRequestFullScreen');

                if (document.mozFullScreenElement) {
                    document.mozCancelFullScreen();
                } else {
                    docelem.mozRequestFullScreen();
                }
            } else if (docelem.msRequestFullscreen) {
                console.log('msRequestFullscreen');

                if (document.msFullscreenElement) {
                    document.msExitFullscreen();
                } else {
                    docelem.msRequestFullscreen();
                }
            } else if (docelem.webkitRequestFullscreen) {
                console.log('webkitRequestFullscreen');

                if (document.webkitFullscreenElement) {
                    document.webkitCancelFullScreen();
                } else {
                    docelem.webkitRequestFullscreen();
                }
            }
        };

        goToSlide(sl);
    });

    $("body").keydown(function (e) {
        if (e.which == 37) { // left
            goToSlide(slide - 1);
        } else if (e.which == 39) { // right
            goToSlide(slide + 1);
        }
    });

    $('#alter').on('click', function () {
        var panel = $('#slide-panel');

        if (panel.hasClass("visible")) {
            panel.removeClass('visible').animate({'margin-left': '-300px'});
            setTimeout(function () {
                panel.css('display', 'none');
            }, 500);
            $('#alter').animate({'margin-left': '-25px'});
        } else {
            panel.css('display', 'block').addClass('visible').animate({'margin-left': '0px'});
            $('#alter').animate({'margin-left': '-35px'});
        }

        return false;
    });

    var resizeId;
    $(window).resize(function () {
        clearTimeout(resizeId);
        resizeId = setTimeout(doneResizing, 100);
    });

    function doneResizing() {
        resize();
    }
}
