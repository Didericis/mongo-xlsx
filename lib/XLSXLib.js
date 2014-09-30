var XLSX = require('xlsx');

module.exports = (function(){
    return {
        openWorkbook : openWorkbook,
        getHeaders : getHeaders,
        getValueAt : getValueAt,
        getRowRange : getRowRange,
        lookupColNum : lookupColNum,
        lookupRowNum : lookupRowNum,
        getColRange : getColRange,
        getRowRange : getRowRange,
        convertNumToExcelCol : convertNumToExcelCol,
        convertExcelColToNum :convertExcelColToNum,
        convertDateCode : convertDateCode
    }

    //http://stackoverflow.com/questions/16229494/converting-excel-date-serial-number-to-date-using-javascript
    function convertDateCode(dateCode){
        var utc_days  = Math.floor(dateCode - 25569);
        var utc_value = utc_days * 86400;                                        
        var date_info = new Date(utc_value * 1000);
        var fractional_day = dateCode - Math.floor(dateCode) + 0.0000001;
        var total_seconds = Math.floor(86400 * fractional_day);
        var seconds = total_seconds % 60;

        total_seconds -= seconds;

        var hours = Math.floor(total_seconds / (60 * 60));
        var minutes = Math.floor(total_seconds / 60) % 60;

        return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
    }

    function openWorkbook(path){
        try{
            mainWorkbook = XLSX.readFile(path);
        }
        catch(e){
        	throw e;
            console.log('Error reading workbook: "' + path + '"');
            process.exit(0);
        }
        return mainWorkbook;
    }

    function getHeaders(worksheet){
        var colRange = getColRange(worksheet);
        var headers = {};
        var value;

        for(var i = colRange[0]; i <= colRange[1]; i++){
            value = getValueAt(worksheet, [1, i]);
            headers[i] = value;
        }

        return headers;
    }

    function getValueAt(worksheet, coords){
        var row = coords[0];
        var col = convertNumToExcelCol(coords[1]);
        var xlsxCoords = col + row;
        var value;

        if (worksheet[xlsxCoords])
            value = worksheet[xlsxCoords].v;

        return value;
    }

    function getRowRange(worksheet, hasHeader){
        var range = worksheet['!ref'];
        hasHeader = true;
        
        range = range.replace(/[^\d.:-]/g, '');
        range = range.split(':');
        
        range[0] = hasHeader ? parseInt(range[0]) + 1 : parseInt(range[0]);
        range[1] = parseInt(range[1]);

        return range;
    }

    function lookupColNum(worksheet, rowNum, string){
        var colRange = getColRange(worksheet);

        for(var i = colRange[0]; i <= colRange[1]; i++){
            if(worksheet[convertNumToExcelCol(i) + rowNum].v == string){
                return i;
            }
        }
    }

    function lookupRowNum(worksheet, colName, string){
        var rowRange = getRowRange(worksheet);

        for(var i = rowRange[0]; i <= rowRange[1]; i++){
            if(worksheet[colName + i].v == string){
                return i;
            }
        }   
    }

    function getColRange(worksheet){
        var range = worksheet['!ref'];
        range = range.replace(/[0-9]/g, '');
        range = range.split(':');
        
        for(var i = 0; i < range.length; i++){
            colNum = convertExcelColToNum(range[i]);
            range[i] = colNum;
        }

        return range;
    }

    function convertExcelColToNum(colName){
        var num = 0;
        for(var i = 0; i < colName.length; i++){
            num += (colName.charCodeAt(i)-64) * Math.pow(26, i);
        }
        return num;
    }

    function convertNumToExcelCol(colNum){
        var charPlaces = 0;
        var charCode; 
        var chars = '';

        while(colNum > 0){
            charCode = (colNum - 1) % 26 + 1;
            chars += String.fromCharCode(charCode + 64);
            colNum = Math.floor((colNum - 1) / 26);
        }

        return chars;
    }   
}());

