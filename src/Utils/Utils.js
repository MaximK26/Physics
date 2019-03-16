export var Utils = {
	defaults : function(options, defaults){
		options = options || {};
		for(var key in defaults){
		    if(!(key in options)) options[key] = defaults[key];
		}
		return options;
	}
}
