"use strict";

var prompt = require('prompt');
var PromiseNN = require('promise'); //Promise (Non Native)

var XLSXLib = require('./XLSXLib');

module.exports = getCredentials;

var DBINUSER = 'dbInUser';
var DBINPASS = 'dbInPass';
var DBOUTUSER = 'dbOutUser';
var DBOUTPASS = 'dbOutPass';

function getCredentials(snowball){
    return new PromiseNN(function(resolve, reject){
        inputCredentials(snowball, resolve, reject);
    });
}

function inputCredentials(snowball, resolve, reject){
    prompt.start();
    prompt.get([DBINUSER, DBINPASS, DBOUTUSER, DBOUTPASS], inputFunc.bind(null, snowball, resolve, reject));
}

function inputFunc(snowball, resolve, reject, err, result){
    var allConnectionInfo = snowball.connectionInfo;
    var workbook = snowball.workbook;

    err = checkForErrs(err, workbook);
    if (err){
        reject(err);
    }
    else{
        var connectionInfo;

        //FIX ME
        for (var i = 0; i < allConnectionInfo.length; i++){
            connectionInfo = allConnectionInfo[i];
            if (connectionInfo.type === 'in'){
                connectionInfo.collection = XLSXLib.openWorkbook(workbook.path).SheetNames[0];
                connectionInfo.user = result[DBINUSER];
                connectionInfo.pass = result[DBINPASS];        
            }
            else if (connectionInfo.type === 'out'){
                connectionInfo.collection = workbook.name;
                connectionInfo.user = result[DBOUTUSER];
                connectionInfo.pass = result[DBOUTPASS];                 
            }
            allConnectionInfo[i] = connectionInfo;
        }
        resolve(snowball);
    }
}

function checkForErrs(err, workbook){
    if (err){
        return err;
    }
    else if (!workbook.path){
        return new Error('No workbook path property');
    }
    else if (!workbook.name){
        return new Error('No workbook name property');
    }
}