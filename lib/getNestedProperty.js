module.exports = function getNestedProperty(obj, nestedProps) {
	var props = nestedProps.split('.');

    for(var i = 0; i < props.length; i++){
    	if(obj === undefined)
    		return undefined;
        obj = obj[props[i]];
    }

    return obj;
}