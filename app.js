'use strict';
var api = require('./routes/api');
var router = require('./routes/router');
var express = require('express');
var appRoot = require('app-root-path');
var config = require('./config');
var compression = require('compression');
var app = express();

app.use(compression());
app.use('/api', api);
app.use('/', router);
app.use(express.static(appRoot + '/public'));
app.listen(config.port);

