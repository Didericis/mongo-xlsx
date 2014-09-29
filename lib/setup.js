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