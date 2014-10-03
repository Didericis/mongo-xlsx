"use strict";

var connectToDBs = require('./lib/connectToDBs');
var getCredentials = require('./lib/getCredentials');
var getOptions = require('./lib/getOptions');
var getWorkbookPath = require('./lib/getWorkbookPath');
var loadConfig = require('./lib/loadConfig');
var queryDBs = require('./lib/queryDBs');
var NPU = require('./lib/NestedPropertyUtil');
var QueryBuilder = require('./lib/QueryBuilder');
var XLSXLib = require('./lib/XLSXLib');

loadConfig( { configFileName : __dirname + '/json/config.json' } ).then
(getOptions).then
(getWorkbookPath).then
(getCredentials).then
(connectToDBs).then
(queryDBs).catch
(dbErrorHandler);

function dbErrorHandler(err){
    console.log('HOORAY');
    console.log(err.stack);
    throw err;
}