'use strict';
var api = require('./routes/api');
var router = require('./routes/router');
var express = require('express');
var appRoot = require('app-root-path');
var config = require('./config');
var app = express();

app.use('/api', api);
app.use('/', router);
app.use(express.static(appRoot + '/public'));
app.listen(config.port);

