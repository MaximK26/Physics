export class Pool {
	constructor() {
		this.objects = [];
		this.type = Object;
	}
	release() {
		for(var i = 0; i < arguments.length; i++) this.objects.push(arguments[i]);
		return this;
	}
	get() {
		if(this.objects.length===0)	return this.constructObject();
		else return this.objects.pop();
	}
	constructObject() {	throw new Error("constructObject() not implemented in this Pool subclass yet!")	};
	resize(size) {
		var objects = this.objects;
		while (objects.length > size) { objects.pop() }
		while (objects.length < size) {	objects.push(this.constructObject()) }
		return this;
	}
}
