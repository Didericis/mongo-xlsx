"use strict";

var fs = require('fs');
var path = require('path');
var PromiseNN = require('promise'); //Promise (Non Native)
var TermMenu = require('terminal-menu');
var DirMenu = require('./DirMenu');

module.exports = getWorkbookPath;

var VALIDEXTENSION = '.xlsx';

function getWorkbookPath(snowball){
    return new PromiseNN(function(resolve, reject){
        getWorkbookNames(snowball, resolve, reject);
    });
}

function getWorkbookNames(snowball, resolve, reject){
    var config = snowball.config;

    if (fs.existsSync(config.workbookLib)){
        fs.readdir(config.workbookLib, readWorkbookDir.bind(null, snowball, resolve, reject));
    }
    else{
        DirMenu(snowball, readWorkbookDir.bind(null, snowball, resolve, reject), reject);
    }
}

function readWorkbookDir(snowball, resolve, reject, err, workbookNames){
    if (err){
        reject(err);
    }
    else {
        displayWorkbookMenu(snowball, resolve, reject, workbookNames);
    }   
}

function displayWorkbookMenu(snowball, resolve, reject, workbookNames){
    var basename;
    var ext;
    var menu = new TermMenu({ width: 29, x: 4, y: 2 });

    menu.reset();
    menu.write('Select XLSX Query File\n');
    menu.write('----------------------\n');
    for (var i = 0; i < workbookNames.length; i++){
        ext = path.extname(workbookNames[i]);
        if (ext === VALIDEXTENSION){
            basename = path.basename(workbookNames[i], VALIDEXTENSION);
            menu.add(basename);
        }
    }
    menu.add('EXIT');

    menu.on('select', selectWorkbook.bind(null, snowball, resolve, reject, menu));
    menu.createStream().pipe(process.stdout);
}

function selectWorkbook(snowball, resolve, reject, menu, label){
    var config = snowball.config;

    menu.close();
    if (label === 'EXIT'){
        console.log('Exiting...');
        process.exit(0);
    }
    else {
        snowball.workbook = {
            name : label,
            path : path.join(config.workbookLib, label + VALIDEXTENSION)
        };
        resolve(snowball);
    }
}