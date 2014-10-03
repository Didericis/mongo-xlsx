'use strict';

var QueryBuilder = require('./QueryBuilder');
var XLSXLib = require('./XLSXLib');

module.exports = getSheetQueries;

function getSheetQueries(sheet){
    var queryBuilder = new QueryBuilder(sheet, dbErrorHandler);
    var rowRange = XLSXLib.getRowRange(sheet);
    var colRange = XLSXLib.getColRange(sheet);
    var queryContainers = [];
    var intialQuery = { $or : [] };
    var val;
    var query;

    for (var r = rowRange[0]; r <= rowRange[1]; r++){
        var queryContainer;

        queryBuilder.startQuery();
        for (var c = colRange[0]; c <= colRange[1]; c++){
            val = XLSXLib.getValueAt(sheet, [r, c]);
            queryBuilder.inputCol(c, val);
        }
        queryContainer = queryBuilder.getQueryContainer();
        intialQuery.$or.push(queryContainer.query);
        queryContainers.push(queryContainer);
    }

    return {
        queryContainers : queryContainers,
        intialQuery : intialQuery
    };
}

//FIX ME
function dbErrorHandler(err){
    console.log(err.stack);
    throw err;
}