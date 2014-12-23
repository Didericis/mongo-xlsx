'use strict';

var XLSX = require('xlsx');
var XLSXLib = require('./XLSXLib');
var json2csv = require('json2csv');
var path = require('path');
var fs = require('fs');
var getSheetQueries = require('./getSheetQueries');
var resultCollection;
var filePath;
var workbook = new XLSXLib.Workbook();

var RESULT_FIELDS = ['id', 'text', 'user.name', 'user.location', 'coordinates.coordinates'];

module.exports = writeResultsToXLSX;

function writeResultsToXLSX(snowball, rc, fileName){
    resultCollection = rc;
    filePath = path.join(snowball.config.resultsLib, fileName);
    workbook.SheetNames.push(resultCollection.collectionName);
    workbook.Sheets[resultCollection.collectionName] = {};
    RESULT_FIELDS.forEach(function(prop, index, array){
        var cell = {v: prop, t:'s'};
        var cellRef = XLSX.utils.encode_cell({c:index,r:0});
        workbook.Sheets[resultCollection.collectionName][cellRef] = cell;
    });

    var cursor = resultCollection.find({});
    var rowNum = 0;

    console.log('Writing results to ' + filePath + '...');
    cursor.nextObject(nextObjectFunc.bind(null, cursor, rowNum));
}

function nextObjectFunc(cursor, rowNum, err, data){
    rowNum += 1;
    if (err){
        console.log(err);
    }
    else if (data){
        addToWorkbook(data, rowNum);
        cursor.nextObject(nextObjectFunc.bind(null, cursor, rowNum));
    }
    else{
        var range = {
            s : {
                c: 0,
                r: 0
            },
            e : {
                c: RESULT_FIELDS.length,
                r: rowNum
            }
        };
        workbook.Sheets[resultCollection.collectionName]['!ref'] = XLSX.utils.encode_range(range);
        XLSX.writeFile(workbook, filePath);
        resultCollection.db.close();
        console.log('Done.');
    }
}

function addToWorkbook(data, rowNum){
    RESULT_FIELDS.forEach(function(prop, index, array){
        var cell = {v: recompose(data, prop), t:'s'};
        var cellRef = XLSX.utils.encode_cell({c:index,r:rowNum});
        workbook.Sheets[resultCollection.collectionName][cellRef] = cell;
    });
}

function recompose(obj, string){
    if (!obj) return '';

    var parts = string.split('.');
    var newObj = obj[parts[0]] || '';
    if(parts[1]){
        parts.splice(0,1);
        var newString = parts.join('.');
        return recompose(newObj,newString);
    }
    return newObj.toString();
}