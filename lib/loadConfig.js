"use strict";

var fs = require('fs');
var PromiseNN = require('promise'); //Promise (Non Native)

module.exports = loadConfig;

function loadConfig(snowball){
    snowball.saveConfig = saveConfig;
    return new PromiseNN(function(resolve, reject){
        readFile(snowball, resolve, reject);
    });
}

function readFile(snowball, resolve, reject){
    var configFileName = snowball.configFileName;

    fs.readFile(configFileName, readFileFunc.bind(null, snowball, resolve, reject));
}

function saveConfig(snowball, resolve, reject){
    fs.writeFile(snowball.configFileName, JSON.stringify(snowball.config, null, 4), function(err){
        if (err) reject(err);
        else resolve(snowball);
    });
}

function readFileFunc(snowball, resolve, reject, err, data){
    if (err){
        reject(err);
    }
    else{
        snowball.config = JSON.parse(data);
        resolve(snowball);
    }
}