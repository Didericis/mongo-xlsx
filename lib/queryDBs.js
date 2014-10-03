'use strict';

var XLSXLib = require('./XLSXLib');
var getSheetQueries = require('./getSheetQueries');

module.exports = queryDBs;

function queryDBs(snowball){
    var allConnectionInfo = snowball.connectionInfo;
    var mainWorkbook = XLSXLib.openWorkbook(snowball.workbook.path);
    var sheet = mainWorkbook.Sheets[mainWorkbook.SheetNames[0]];
    var sheetQueries = getSheetQueries(sheet);
    var queryContainers = sheetQueries.queryContainers;
    var insertedIDs = {};
    var duplicateIDs = {};
    var options = snowball.options;
    var cursor;
    var collections = defineCollections(allConnectionInfo, options);

    nextQueryFunc(insertedIDs, duplicateIDs, queryContainers, cursor, options, collections);
}

function nextQueryFunc(insertedIDs, duplicateIDs, queryContainers, cursor, options, collections){
    var queryContainer;

    if (queryContainers.length !== 0){
        if(options.verbose){
            console.log('\nNext Query:');
        }
        queryContainer = queryContainers.pop();
        cursor = collections.queryCollection.find(queryContainer.query);
        cursor.nextObject(nextObjectFunc.bind(null, insertedIDs, duplicateIDs, queryContainers, queryContainer, cursor, options, collections));
    }
    else{
        if((options.verbose) && (duplicateIDs !== {})){
            console.log('\nThe following ids were found in multiple queries and ommited from the results:');
            console.dir(duplicateIDs);
        }
        if(!options.repress){
            console.log(Object.keys(insertedIDs).length + ' results added to ' + [collections.resultCollection.db.databaseName, collections.resultCollection.collectionName].join('.'));
        }
        collections.queryCollection.db.close();
        collections.resultCollection.db.close();
        console.log('Done.');
    }
}

function nextObjectFunc(insertedIDs, duplicateIDs, queryContainers, queryContainer, cursor, options, collections, err, data){
    if (err) dbErrorHandler(err);

    if(data === null){
        nextQueryFunc(insertedIDs, duplicateIDs, queryContainers, cursor, options, collections);
    }
    else if (insertedIDs[data._id] === undefined){
        data.addedFields = queryContainer.fieldInserts;
        collections.resultCollection.insert(data, {w:1}, function(err, result){
            if (err) dbErrorHandler(err);

            if(options.verbose){
                console.log('inserted: ' + data._id);
            }
            insertedIDs[data._id] = queryContainer;
            cursor.nextObject(nextObjectFunc.bind(null, insertedIDs, duplicateIDs, queryContainers, queryContainer, cursor, options, collections));
        });
    }
    else{
        collections.resultCollection.remove({ _id : data._id }, function(err, result){
            if(options.verbose){
                console.log('removed: ' + data._id);
            }
            cursor.nextObject(nextObjectFunc.bind(null, insertedIDs, duplicateIDs, queryContainers, queryContainer, cursor, options, collections));
        });
        if (!duplicateIDs[data._id]){
            duplicateIDs[data._id] = [insertedIDs[data._id]];
        }
        duplicateIDs[data._id].push(queryContainer);
    }
}

//FIX ME
function defineCollections(allConnectionInfo, options){
    var connectionInfo;
    var collections = {};

    for (var i = 0; i < allConnectionInfo.length; i++){
        connectionInfo = allConnectionInfo[i];
        if (connectionInfo.type === 'in'){
            collections.queryCollection = connectionInfo.mongoObjs.collection;
            if(!options.repress){
                console.log('Searching ' + [connectionInfo.db, connectionInfo.collection].join('.') + '...');
            }
        }
        else if (connectionInfo.type == 'out'){
            collections.resultCollection = connectionInfo.mongoObjs.collection;
        }
    }

    return collections;
}

//FIX ME
function dbErrorHandler(err){
    console.log(err.stack);
    throw err;
}