var Promise = require('promise');
var fs = require('fs');

module.exports = setup;

function setup(){
    return new Promise(function (resolve, reject){
        var configFileName = 'json/config.json';
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

        console.log('test');

        fs.exists(configFileName, function (exists) {
            if (!exists){
                configJSON = JSON.stringify(config, null, 4);
                fs.writeFile(configFileName, configJSON, function(err){
                    if (err) reject(err);
                    resolve(cli, config);
                });
            }
            else{
                fs.readFile(configFileName, function(err, data){
                    if (err) reject(err);
                    config = JSON.parse(data);
                    resolve(cli, config);
                });
            }
        });

    });
}