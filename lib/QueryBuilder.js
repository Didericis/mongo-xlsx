var XLSXLib = require('XLSXLib');
var getNestedProperty = require('getNestedProperty');
var moment = require('moment');

module.exports = QueryBuilder;

function QueryBuilder(sheet, errHandler){
    errHandler = errHandler || function(err){};
    var headers = {};
    var query = {};
    var fieldInserts = {};
    var colFuncs = {};
    var queryFuncs = {
        query : {
            text : {
                contains : function(value){
                    value = '\"' + value + '\"';
                    if (query['$text'] === undefined){
                        query['$text'] = { $search : value, $language: 'en' };
                    }
                    else{
                        query['$text']['$search'] += ' ' + value;
                    }
                },
                equals : function(value){}
            },
            geotag : {
                equals : function(value){},
                within : function(value){},
                city : function(value){
                    query['city'] = value;
                }
            },
            date : {
                date : function(value){
                    var date = XLSXLib.convertDateCode(value);
                    var start = moment(date).toDate();
                    var end = moment(date).add('days', 1).toDate();

                    query['created_on'] = {$gte: start, $lt: end};
                    return query;
                },
                before : function(value){},
                after : function(value){}
            }
        }
    }
    var returnObj = {
        startQuery : startQuery,
        getQueryContainer : getQueryContainer,
        fieldInserts : fieldInserts,
        inputCol : inputCol
    };

    return initialize();

    function initialize(){
        headers = XLSXLib.getHeaders(sheet);
        colFuncs = buildColFuncs(headers);
        return returnObj;
    }

    function buildColFuncs(headers){
        var colFuncs = {};
        var queryFunc;

        for(var header in headers){
            headerVal = headers[header];

            if (!headerVal){
                errHandler(new Error('Every column must have a header'));
            }

            headerVal = headerVal.toLowerCase();
            queryFunc = getNestedProperty(queryFuncs, headerVal);
            if (queryFunc !== undefined){
                colFuncs[header] = queryFunc;
            }
            else{
                headerVal = headers[header]; //Reset case
                colFuncs[header] = new AddFieldFunc(headerVal);
            }
        }

        return colFuncs;
    }

    function AddFieldFunc(name){
        function addFieldFunc(value){
            fieldInserts[name] = value;
        }
        return addFieldFunc;
    }

    function startQuery(){
        query = {};
        fieldInserts = {};
    }

    function inputCol(col, value){
        colFuncs[col](value);
    }

    function getQueryContainer(){
        return {
            query : query,
            fieldInserts : fieldInserts
        };
    }
}