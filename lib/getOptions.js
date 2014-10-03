"use strict";

var cli = require('cli');
var fs = require('fs');
var path = require('path');
var PromiseNN = require('promise'); //Promise (Non Native)
var prompt = require('prompt');
var TermMenu = require('terminal-menu');

var NPU = require('./NestedPropertyUtil');

module.exports = getOptions;

var MENUOPTIONS = {
	mkDefault = 'MAKE DEFAULT',
	accept = 'ACCEPT',
	exit = 'EXIT'
}

function getOptions(snowball){
    return new PromiseNN(function(resolve, reject){
        defineOptions(snowball, resolve, reject);
    });
}

function defineOptions(snowball, resolve, reject){
    cli.parse({
        repress: ['r', 'Do not output any information', 'bool', false],
        verbose: ['v', 'Output information about inserts', 'bool', false],
        configure: ['c', 'Configure paths and other settings', 'bool', false]
    });

    cli.main(prepOptions.bind(null, snowball, resolve, reject));
}

function prepOptions(snowball, resolve, reject, args, options){
    snowball.options = options;
    if (snowball.options.configure){
        configMenu(snowball, resolve, reject);
    }
    else{
        prepAndResolve(snowball, resolve, reject);
    }
}

function configMenu(snowball, resolve, reject){
    var menu = new TermMenu({ width: 40, x: 4, y: 2 });
    var options = snowball.options;
    var config = snowball.config;
    var configProps = NPU.getAllProps(config);

    menu.reset();
    menu.write('Select a field and press enter to change\n');
    menu.write('----------------------------------------\n');
    configProps.forEach(function(configProp){
        menu.add(configProp + ': ' + NPU.get(config, configProp));
    });
    menu.add(MENUOPTIONS.mkDefault);
    menu.add(MENUOPTIONS.accept);
    menu.add(MENUOPTIONS.exit);

    menu.on('select', selectConfigProp.bind(null, snowball, resolve, reject, menu));
    menu.createStream().pipe(process.stdout);
    console.log('wut');
}

function selectConfigProp(snowball, resolve, reject, menu, label){
    var config = snowball.config;

    menu.close();
    if (label === MENUOPTIONS.exit){
        console.log('Exiting...');
        process.exit(0);
    }
    else if (label === MENUOPTIONS.accept){
        prepAndResolve(snowball, resolve, reject);
    }
    else if (label === MENUOPTIONS.mkDefault){
        menu.write('Saving...');
        fs.writeFile(snowball.configFileName, JSON.stringify(config, null, 4), function(err){
            if (err) reject(err);
            configMenu(snowball, resolve, reject);
        });
    }
    else{
        var configProp = label.split(':')[0];
        editPropValue(snowball, resolve, reject, configProp);
    }
}

function editPropValue(snowball, resolve, reject, configProp){
    var config = snowball.config;

    prompt.get([configProp], function (err, result) {
        if (err) reject(err);
        NPU.set(config, configProp, result[configProp]);
        configMenu(snowball, resolve, reject);
    }); 
}

function prepAndResolve(snowball, resolve, reject){
    snowball.connectionInfo = JSON.parse(JSON.stringify(snowball.config.dbs));
    resolve(snowball);
}