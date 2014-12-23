"use strict";

var fs = require('fs');
var path = require('path');
var PromiseNN = require('promise'); //Promise (Non Native)
var TermMenu = require('terminal-menu');
var originalPath;
var snowball;
var resolve;
var reject;

module.exports = initialize;

function initialize(sb, res, rej, dirPath, orgPath, cb){
    snowball = sb;
    resolve = res;
    reject = rej;
    originalPath = snowball.config.workbookLib;
    DirMenu(process.env.HOME);
}

function DirMenu(dirPath){
    var menu = new TermMenu({ width: 29, x: 4, y: 2 });
    var dirs = getDirs(dirPath);

    menu.on('select', dirMenuFunc.bind(null, menu, dirPath));
    menu.createStream().pipe(process.stdout);
    menu.reset();
    menu.write('Path "' + originalPath + '" not found.\n');
    menu.write('Please select a new path.\n');
    menu.write('----------------------\n');
    menu.write(dirPath + '\n');
    menu.write('----------------------\n');
    menu.add('..');
    for (var i = 0; i < dirs.length; i++){
        menu.add(dirs[i]);
    }
    menu.add('CONFIRM')
    menu.add('EXIT');
}

function dirMenuFunc(menu, dirPath, arg){
    menu.close();
    if (arg == 'CONFIRM'){
        snowball.config.workbookLib = dirPath;
        snowball.saveConfig(snowball, fs.readdir.bind(null, dirPath, resolve), reject);
        return;
    }
    else if (arg == 'EXIT'){
        return;
    }
    else{
        dirPath = path.join(dirPath, arg);
    }
    DirMenu(dirPath);
}

function getDirs(dirPath){
    var files = fs.readdirSync(dirPath);
    var dirs = [];

    for(var i = 0; i < files.length; i++){
        if (fs.lstatSync(path.join(dirPath, files[i])).isDirectory()){
            dirs.push(files[i]);
        }
    }

    return dirs;
}