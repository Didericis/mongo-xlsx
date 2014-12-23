"use strict";

var EventEmitter = require('events').EventEmitter;
var MongoClient = require('mongodb').MongoClient;
var PromiseNN = require('promise'); //Promise (Non Native)
var TermMenu = require('terminal-menu');

module.exports = connectToDBs;

var UNCONNECTED = 0;
var CONNECTED = 1;
var CONNECTING = 2;
var MENUOPTIONS = {
	yes : 'YES',
	no : 'NO'
};

var connectionEvents = new EventEmitter();

function connectToDBs(snowball){
    return new PromiseNN(function(resolve, reject){
        var allConnectionInfo = snowball.connectionInfo;
        var unconnectedDBInfo = getUnconnectedDB(allConnectionInfo);

        connectionEvents.on('dbConnected', checkIfDoneConnecting.bind(null, allConnectionInfo)); 
        connectionEvents.on('allDBsConnected', resolve.bind(null, snowball));

        while (unconnectedDBInfo) {
            connectToDB(unconnectedDBInfo, reject);
            unconnectedDBInfo = getUnconnectedDB(allConnectionInfo);
        }
    });
}

function checkIfDoneConnecting(allConnectionInfo){
    var connectionInfo;
    for (var i = 0; i < allConnectionInfo.length; i++) {
        connectionInfo = allConnectionInfo[i];
        if (connectionInfo.status != CONNECTED) {
            return;
        }
    }
    connectionEvents.emit('allDBsConnected');
}

function getUnconnectedDB(allConnectionInfo){
    var connectionInfo;

    for (var i = 0; i < allConnectionInfo.length; i++) {
        connectionInfo = allConnectionInfo[i];
        if (connectionInfo.status === undefined) {
            connectionInfo.status = UNCONNECTED;
        }
        if (connectionInfo.status === UNCONNECTED) {
            return connectionInfo;
        }
    }
}

function connectToDB(connectionInfo, reject){
	var authString = '';
	var connectString = connectionInfo.host + ':' + connectionInfo.port + '/' + connectionInfo.db;

	if (connectionInfo.user && connectionInfo.pass){
		authString = connectionInfo.user + ':' + connectionInfo.pass + '@';
	}

    connectionInfo.status = CONNECTING;
    console.log('Connecting to "' + connectionInfo.db + '.' + connectionInfo.collection + '"...');
    MongoClient.connect('mongodb://' + authString + connectString + '?authSource=admin',
    dbOpenFunc.bind(null, connectionInfo, reject));

}

function dbOpenFunc(connectionInfo, reject, err, db){
    if(err){
        reject(err);
    }
    else{
        connectFunc(connectionInfo, db, reject, null, true);
    }
}

function connectFunc(connectionInfo, db, reject, err, auth){
    var collectionName = connectionInfo.collection;

    if (err){
        reject(err);
    }
    else if (!err && !auth){
        reject(new Error('Could not authenticate user ' + connectionInfo.user));
    }
    else if (connectionInfo.mongoObjs){
        reject(new Error('Should not have mongoObjs yet. Did you remake a connection?'));
    }
    else{
        connectionInfo.mongoObjs = { db : db };
        db.collectionNames(searchCollectionNames.bind(null, connectionInfo, reject));               
    }
}

function searchCollectionNames(connectionInfo, reject, err, collectionNames){
    var collectionName = connectionInfo.collection;
    var db = connectionInfo.mongoObjs.db;
    var fullCollectionName = connectionInfo.db + '.' + connectionInfo.collection;

    if (err){
        reject(err);
    }
    else if (connectionInfo.status === UNCONNECTED){
        reject(new Error('ConnectionInfo should not be unconnected'));
    }
    else if (connectionInfo.type === 'out'){
        checkIfCollectionExists(connectionInfo, collectionNames, reject);  
    }
    else {
        connectToCollection(connectionInfo, db, collectionName, reject);
    }
}

function checkIfCollectionExists(connectionInfo, collectionNames, reject){
    var db = connectionInfo.mongoObjs.db;
    var collectionName = connectionInfo.collection;
    var fullCollectionName = connectionInfo.db + '.' + collectionName;
    var exists = false;

    for(var i = 0; i < collectionNames.length; i++){
        if (collectionNames[i].name === fullCollectionName)
            exists = true;
    }
    if(exists){
        var msg = 'Collection by the name "' + collectionName;
        msg += '" already exits. Overwrite?';
        confirmationMenu(connectionInfo, msg, reject);
    }
    else{
        connectToCollection(connectionInfo, db, collectionName, reject);
    }
}

function confirmationMenu(connectionInfo, msg, reject){
    var menu = new TermMenu({ width: 30, x: 4, y: 2 });
    var newMessage = '';
    var result;

    menu.reset();
    while (msg.length > menu.width){
        menu.write(msg.slice(0, 30) + '\n');
        msg = msg.slice(30);
    }
    menu.write(msg);
    menu.write('\n-------------------------\n');
    menu.add(MENUOPTIONS.yes);
    menu.add(MENUOPTIONS.no);

    menu.createStream().pipe(process.stdout);   
    menu.on('select', selectConfirmationOption.bind(null, connectionInfo, menu, reject));
}

function selectConfirmationOption(connectionInfo, menu, reject, label){
    var db = connectionInfo.mongoObjs.db;
    var collection = connectionInfo.mongoObjs.collection;
    var collectionName = connectionInfo.collection;

    menu.close();
    if (label === MENUOPTIONS.yes){
        // console.log('Overwriting ' + db.databaseName + '.' + collectionName + '...');
        db.dropCollection(collectionName, dropCollectionFunc.bind(null, connectionInfo, reject));
    }
    else if (label === MENUOPTIONS.no){
        console.log('Exiting...');
        process.exit(0);
    }
    else {
        reject(new Error('Selected unknown option.'));
    } 
}

function dropCollectionFunc(connectionInfo, reject, err){
    var db = connectionInfo.mongoObjs.db;
    var collectionName = connectionInfo.collection;

    if (err){
        reject(err);
    }
    else if (!reject){
        reject(new Error('Could not drop collection.'));
    }
    else{
        // console.log('Done.');
        connectToCollection(connectionInfo, db, collectionName);
    }
}

function connectToCollection(connectionInfo, db, collectionName, reject){
    // console.log('Connected to "' + db.databaseName + '.' + collectionName + '".');
    connectionInfo.mongoObjs.collection = db.collection(collectionName);
    connectionInfo.status = CONNECTED;
    connectionEvents.emit('dbConnected');
}
