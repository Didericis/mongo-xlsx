var fs = require('fs');
var path = require('path');
var cli = require('cli');
var mongodb = require('mongodb');
var prompt = require('prompt');
var TermMenu = require('terminal-menu');
var NPU = require('./lib/NestedPropertyUtil');
var QueryBuilder = require('./lib/QueryBuilder');
var XLSXLib = require('./lib/XLSXLib');

var configFileName = 'config.json';

setup();

function setup(){
    var callback = defineCLIOptions;
    var cli = require('cli');
    var config = {
        wbkLib : process.env.HOME + '/Documents',
        dbIn : {
            name : 'test',
            host : 'localhost',
            port : 27017
        },
        dbOut : {
            name : 'test',
            host : 'localhost',
            port : 27017
        }
    };
    var configJSON;

    fs.exists(configFileName, function (exists) {
        if (!exists){
            configJSON = JSON.stringify(config);
            fs.writeFile(configFileName, configJSON, function(err){
                if (err) dbErrorHandler(err);
                callback(cli, config);
            });
        }
        else{
            fs.readFile(configFileName, function(err, data){
                if (err) dbErrorHandler(err);
                config = JSON.parse(data);
                callback(cli, config);
            });
        }
    });
}

function defineCLIOptions(cli, config){
    var callback = prepOptions;
    var option;

    cli.parse({
        repress: ['r', 'Do not output any information', 'bool', false],
        verbose: ['v', 'Output information about inserts', 'bool', false],
        configure: ['c', 'Configure paths and other settings', 'bool', false]
    });

    cli.main(callback.bind(null, config));
}

function prepOptions(config, args, options){
    var callback = getWBKPath;

    function optionMenu(config){
        var menu = TermMenu({ width: 40, x: 4, y: 2 });
        var props = NPU.getAllProps(config);

        menu.reset();
        menu.write('Select a field and press enter to change\n');
        menu.write('----------------------------------------\n');
        props.forEach(function(prop){
            menu.add(prop);
        });
        menu.add('MAKE DEFAULT');
        menu.add('ACCEPT');
        menu.add('EXIT');

        menu.on('select', function (label) {
            var prop = label.split(':')[0];
            var firstProp = prop.split('.')[0];

            menu.close();
            if (label === 'EXIT'){
                console.log('Exiting...');
                process.exit(0);
            }
            else if (label === 'ACCEPT'){
                callback(config, options);
            }
            else if (label === 'MAKE DEFAULT'){
                menu.write('Saving...');
                fs.writeFile('config.json', JSON.stringify(config, null, 4), function(err){
                    if (err) dbErrorHandler(err);
                    optionMenu(config);
                });
            }
            else{
                prompt.get([prop], function (err, result) {
                    if (err) dbErrorHandler(err);

                    config = NPU.set(config, prop, result[prop]);
                    optionMenu(config);
                });
            }
        });
        menu.createStream().pipe(process.stdout);
    }

    if (options.configure){
        optionMenu(config);
    }
    else{
        callback(config, options);
    }
}

function getWBKPath(config, options){
    var callback = getCredentials;
    var workbookNames = [];
    var ext;
    var basename;
    var validExtension;

    fs.readdir(config.wbkLib, function(err, files){
        if (err) dbErrorHandler(err);
        wbkMenu(files);
    });

    function wbkMenu(fileNames){
        var menu = TermMenu({ width: 29, x: 4, y: 2 });

        menu.reset();
        menu.write('Select XLSX Query File\n');
        menu.write('-------------------------\n');
        for(var i = 0; i < fileNames.length; i++){
            ext = path.extname(fileNames[i]);
            basename;
            validExtension = '.xlsx';
            if(ext === validExtension){
                basename = path.basename(fileNames[i], validExtension);
                menu.add(basename);
                workbookNames.push(basename)
            }
        }
        menu.add('EXIT');

        menu.on('select', function (label) {
            menu.close();
            if(label === 'EXIT'){
                console.log('Exiting...');
                process.exit(0);
            }
            else{
                config.wbkName = label;
                config.wbkPath = path.join(config.wbkLib, label + validExtension);
                callback(config, options);
            }
        });
        menu.createStream().pipe(process.stdout);
    }
}

function getCredentials(config, options){
    var callback = connectToDBs;

    prompt.start();
    prompt.get(['dbInUser', 'dbInPass', 'dbOutUser', 'dbOutPass'], function (err, result) {
        if (err) throw err;

        config.dbIn.user = result.dbInUser;
        config.dbIn.pass = result.dbInPass;
        config.dbIn.collection = XLSXLib.openWorkbook(config.wbkPath).SheetNames[0];
        config.dbOut.user = result.dbOutUser;
        config.dbOut.pass = result.dbOutPass;
        config.dbOut.collection = config.wbkName;

        callback(config, options);
    });
}

function connectToDBs(config, options){
    connectToDB(config.dbIn, function(queryCollection, queryDb){
        connectToDB(config.dbOut, function(resultCollection, resultDb){
            collectionExists(resultDb, config.dbOut.collection, function(exists){
                if(exists){
                    var msg = 'Collection by the name "' + config.dbOut.collection;
                    msg += '" already exits. Overwrite?';
                    confirmationMenu(msg, function(result){
                        if (result){
                            console.log('Overwriting ' + config.dbOut.collection + '...');
                            resultDb.dropCollection(config.dbOut.collection, function(err){
                                if (err) dbErrorHandler(err);

                                console.log('Done.');
                                main(config, options, queryCollection, resultCollection);
                            });
                        }
                        else{
                            console.log('Exiting...');
                            process.exit(0);
                        }
                    });
                }
                else{
                    main(config, options, queryCollection, resultCollection);
                }
            });
        });
    });   
}

function confirmationMenu(msg, callback){
    var menu = TermMenu({ width: 30, x: 4, y: 2 });
    var newMessage = '';
    var result;

    menu.reset();

    while (msg.length > menu.width){
        menu.write(msg.slice(0, 30) + '\n');
        msg = msg.slice(30);
    }
    menu.write(msg);
    menu.write('\n-------------------------\n');
    menu.add('YES');
    menu.add('NO');
    menu.add('EXIT');

    menu.on('select', function (label) {
        menu.close();
        if(label === 'EXIT'){
            console.log('Exiting...');
            process.exit(0);
        }
        else if (label === 'YES'){
            result = true;
        }
        else if (label === 'NO'){
            result = false;
        }
        callback(result);
    });
    menu.createStream().pipe(process.stdout);   
}

function connectToDB(fields, callback){
    var collection;
    var database = new mongodb.Db(fields.name, new mongodb.Server("127.0.0.1", 27017), {safe: false});

    database.open(function(err, db) {
        if(err){
            dbErrorHandler(err);
        }
        else{
            if (fields.user && fields.pass){
                db.authenticate(fields.user, fields.pass, connect.bind(null, db));
            }
            else{
                connect(db, null, true);
            }
        }
    });

    function connect(db, err, auth) {
        if (!err && !auth){
            err = new Error('Could not authenticate user ' + fields.user);
        }
        if (err){
            dbErrorHandler(err);
        }
        else{
            collection = db.collection(fields.collection);
            callback(collection, db);                    
        }
    }
}

function dbErrorHandler(err){
    throw err;
    // console.dir(err);
    // process.exit(1);
}

function collectionExists(db, collectionName, callback){
    var result = false;

    db.collectionNames(function(err, collectionNames){
        collectionName = db.databaseName + '.' + collectionName;
        for(var i = 0; i < collectionNames.length; i++){
            if (collectionNames[i].name === collectionName)
                result = true;
        }
        callback(result);
    });
}

function main(config, options, queryCollection, resultCollection){
    var mainWorkbook = XLSXLib.openWorkbook(config.wbkLib + '/' + config.wbkName + '.xlsx');
    var sheet = mainWorkbook.Sheets[mainWorkbook.SheetNames[0]];
    var sheetQueries = getSheetQueries(sheet);
    var queryContainers = sheetQueries.queryContainers;
    var insertedIDs = {};
    var duplicateIDs = {};

    if(!options.repress){
        console.log('Searching ' + [config.dbIn.name, config.dbIn.collection].join('.') + '...');
    }
    nextQueryFunc();

    function nextQueryFunc(){
        var queryContainer;

        if (queryContainers.length !== 0){
            if(options.verbose){
                console.log('\nNext Query:');
            }
            queryContainer = queryContainers.pop();
            cursor = queryCollection.find(queryContainer.query);
            cursor.nextObject(nextObjectFunc);
        }
        else{
            if((options.verbose) && (duplicateIDs !== {})){
                console.log('\nThe following ids were found in multiple queries and ommited from the results:');
                console.dir(duplicateIDs);
            }
            if(!options.repress){
                console.log(Object.keys(insertedIDs).length + ' results added to ' + [config.dbOut.name, config.dbOut.collection].join('.'));
            }
            console.log('Done.');
            process.exit(0);
        }

        function nextObjectFunc(err, data){
            if (err) dbErrorHandler(err);

            if(data === null){
                nextQueryFunc();
            }
            else if (insertedIDs[data._id] === undefined){
                data.addedFields = queryContainer.fieldInserts;
                resultCollection.insert(data, {w:1}, function(err, result){
                    if (err) dbErrorHandler(err);

                    if(options.verbose){
                        console.log('inserted: ' + data._id);
                    }
                    insertedIDs[data._id] = queryContainer;
                    cursor.nextObject(nextObjectFunc);
                });
            }
            else{
                resultCollection.remove({ _id : data._id }, function(err, result){
                    if(options.verbose){
                        console.log('removed: ' + data._id);
                    }
                    cursor.nextObject(nextObjectFunc);
                });
                if (!duplicateIDs[data._id]){
                    duplicateIDs[data._id] = [insertedIDs[data._id]];
                }
                duplicateIDs[data._id].push(queryContainer);
            }
        }
    }
}

function getSheetQueries(sheet){
    var queryBuilder = new QueryBuilder(sheet, dbErrorHandler);
    var rowRange = XLSXLib.getRowRange(sheet);
    var colRange = XLSXLib.getColRange(sheet);
    var queryContainers = [];
    var intialQuery = { $or : [] };
    var val;
    var query;

    for (var r = rowRange[0]; r <= rowRange[1]; r++){
        queryBuilder.startQuery();
        for (var c = colRange[0]; c <= colRange[1]; c++){
            val = XLSXLib.getValueAt(sheet, [r, c]);
            queryBuilder.inputCol(c, val);
        }
        queryContainer = queryBuilder.getQueryContainer();
        intialQuery['$or'].push(queryContainer.query);
        queryContainers.push(queryContainer);
    }

    return {
        queryContainers : queryContainers,
        intialQuery : intialQuery
    }
}

