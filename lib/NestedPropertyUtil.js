module.exports = (function(){
	return {
		get : get,
		set : set,
		getAllProps : getAllProps
	}

	function get(obj, nestedProps) {
		var props = nestedProps.split('.');

	    for(var i = 0; i < props.length; i++){
	    	if(obj === undefined)
	    		return undefined;
	        obj = obj[props[i]];
	    }

	    return obj;
	}

	function set(obj, nestedProps, value) {
	    var props = nestedProps.split('.')
	    var len = props.length - 1;
	    var tmpObj = obj;
	    
	    for (var i = 0; i < len; i++) {
	        tmpObj = tmpObj[props[i]];
	    }
	    tmpObj[props[len]] = value;

	    return obj;
	}

	function getAllProps(obj, nest){
	    var props = [];
	    var newNest;
	    var newObj;
	    var nested;

	    for(var prop in obj){
	        newNest = nest ? [nest, prop].join('.') : prop;
	        if ((typeof obj[prop] === 'object') && (Object.keys(obj[prop]))){
	            newObj = obj[prop];
	            props = props.concat(getAllProps(newObj, newNest));
	        }
	        else{
	            props.push(newNest + ': ' + obj[prop]);
	        }
	    }

	    return props;
	} 
}());