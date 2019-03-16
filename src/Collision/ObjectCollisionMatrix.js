export class ObjectCollisionMatrix {
	constructor() {	this.matrix = {}; }
	get(i, j) {
		i = i.id;
		j = j.id;
		if (j > i) {
			var temp = j;
			j = i;
			i = temp;
		}
		return i+'-'+j in this.matrix;
	}
	set(i, j, value) {
		i = i.id;
		j = j.id;
		if (j > i) {
			var temp = j;
			j = i;
			i = temp;
		}
		if (value) {
			this.matrix[i+'-'+j] = true;
		}
		else {
			delete this.matrix[i+'-'+j];
		}
	}
	reset() { this.matrix = {}; };
	setNumObjects(n) { }
}
