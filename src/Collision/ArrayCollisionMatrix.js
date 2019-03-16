export class ArrayCollisionMatrix {
	constructor() {	this.matrix = []; }
	get(i, j) {
		i = i.index;
		j = j.index;
		if (j > i) {
			var temp = j;
			j = i;
			i = temp;
		}
		return this.matrix[(i*(i + 1)>>1) + j-1];
	}
	set(i, j, value) {
		i = i.index;
		j = j.index;
		if (j > i) {
			var temp = j;
			j = i;
			i = temp;
		}
		this.matrix[(i*(i + 1)>>1) + j-1] = value ? 1 : 0;
	}
	reset() {
		for (var i=0, l=this.matrix.length; i!==l; i++) {
			this.matrix[i]=0;
		}
	}
	setNumObjects(n) {
		this.matrix.length = n*(n-1)>>1;
	}
}