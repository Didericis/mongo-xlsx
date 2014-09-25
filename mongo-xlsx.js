var fs = require('fs');
var path = require('path');
var mongodb = require('mongodb');
var prompt = require('prompt');
var TermMenu = require('terminal-menu');
var QueryBuilder = require('./lib/QueryBuilder');
var XLSXLib = require('./lib/XLSXLib');

var options = (function() {
    var options = {
        repress : false,
        verbose : false,
        configure : false
    }
    var synonyms = {};
    synonyms['-r'] = 'repress';
    synonyms['-v'] = 'verbose';
    synonyms['-c'] = 'configure';

    function get(name){
        var option = options[name];

        if (!option){
            option = options[synonyms[name]];
        }

        return option;
    }

    function set(name, value){
        if (options[name]){
            options[name] = value;
            return true;          
        }
        else if (synonyms[name]){
            options[synonyms[name]] = value;
            return true;
        }
        else{
            return false;
        }
    }

    function contains(name){
        return (options[name] || synonyms[name]);
    }

    return {
        get : get,
        set : set,
        contains : contains
    }

}());
var wbkPath = process.env.HOME + '/Documents';

getOptions(start);

function start(){
    var fileNames = fs.readdirSync(wbkPath);
    var menu = TermMenu({ width: 29, x: 4, y: 2 });
    var workbookNames = [];
    var ext;
    var basename;
    var validExtension;

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
            getCredentials(label);
        }
    });
    menu.createStream().pipe(process.stdout);

}

function getOptions(callback){
    var option;

    args = process.argv;
    args.splice(0, 2);
    for(var i = 0; i < args.length; i++){
        option = args[i];
        if (options.contains(option)){
            options.set(option, true);
        }
        else{
            console.log('"' + option + '": invalid option.');
        }
    }

    if (options.get('configure')){
        prompt.start();
        prompt.get(['Folder'], function (err, result) {
            if (err) throw err;
            wbkPath = result.Folder;
            callback();
        });
    }
    else{
        callback();
    }
}

function getCredentials(workbookName){
    prompt.start();
    prompt.get(['user', 'pass'], function (err, result) {
        if (err) throw err;

        var QueryDb = {
            host : 'localhost',
            port : 27017
        };
        var queryFields = {
            database : 'test',
            collection : 'test',
            user : result.user,
            pass : result.pass
        };
        var resultFields = {
            database : 'test',
            collection : undefined,
            user : result.user,
            pass : result.pass
        };

        resultFields.collection = workbookName;
        connectToDbs(workbookName, queryFields, resultFields);
    });
}

function connectToDbs(workbookName, queryFields, resultFields){
    connectToDB(queryFields, function(queryCollection, queryDb){
        connectToDB(resultFields, function(resultCollection, resultDb){
            collectionExists(resultDb, resultFields.collection, function(exists){
                if(exists){
                    var msg = 'Collection by the name "' + resultFields.collection;
                    msg += '" already exits. Please rename and try again.';
                    dbErrorHanlder(msg);
                }
                else{
                    main(workbookName, queryCollection, resultCollection);
                }
            });
        });
    });   
}

function connectToDB(fields, callback){
    var collection;
    var database = new mongodb.Db(fields.database, new mongodb.Server("127.0.0.1", 27017), {safe: false});

    database.open(function(err, db) {
        if(err){
            dbErrorHanlder(err);
        }
        else{
            db.authenticate(fields.user, fields.pass, function(err, result) {
                if (!err && !result){
                    err = new Error('Could not authenticate user ' + fields.user);
                }
                if (err){
                    dbErrorHanlder(err);
                }
                else{
                    collection = db.collection(fields.collection);
                    callback(collection, db);                    
                }
            });
        }
    });
}

function dbErrorHanlder(err){
    console.dir(err);
    process.exit(1);
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

function main(workbookName, queryCollection, resultCollection){
    var mainWorkbook = XLSXLib.openWorkbook(wbkPath + '/' + workbookName + '.xlsx');
    var sheet = mainWorkbook.Sheets[mainWorkbook.SheetNames[0]];
    var sheetQueries = getSheetQueries(sheet);
    var queryContainers = sheetQueries.queryContainers;
    var insertedIDs = {};
    var duplicateIDs = {};

    if(!options.get('repress')){
        console.log('Searching...');
    }
    nextQueryFunc();

    function nextQueryFunc(){
        var queryContainer;

        if (queryContainers.length !== 0){
            if(options.get('verbose')){
                console.log('\nNext Query:');
            }
            queryContainer = queryContainers.pop();
            cursor = queryCollection.find(queryContainer.query);
            cursor.nextObject(nextObjectFunc);
        }
        else{
            if(options.get('verbose') && (duplicateIDs !== {})){
                console.log('\nThe following ids were found in multiple queries and ommited from the results:');
                console.dir(duplicateIDs);
            }
            else if(!options.get('repress')){
                console.log(Object.keys(insertedIDs).length + ' results.');
            }
            console.log('Done.');
            process.exit(0);
        }

        function nextObjectFunc(err, data){
            if (err) dbErrorHanlder(err);

            if(data === null){
                nextQueryFunc();
            }
            else if (insertedIDs[data._id] === undefined){
                data.addedFields = queryContainer.fieldInserts;
                resultCollection.insert(data, {w:1}, function(err, result){
                    if (err) dbErrorHanlder(err);

                    if(options.get('verbose')){
                        console.log('inserted: ' + data._id);
                    }
                    insertedIDs[data._id] = queryContainer;
                    cursor.nextObject(nextObjectFunc);
                });
            }
            else{
                resultCollection.remove({ _id : data._id }, function(err, result){
                    if(options.get('verbose')){
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
    var queryBuilder = new QueryBuilder(sheet, dbErrorHanlder);
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

