export class Solver {
	constructor() {
		this.equations = [];
	}
	
	solve( dt, world ) { return 0 }
	
	addEquation( eq ) { if (eq.enabled) this.equations.push(eq) }
	
	removeEquation( eq ) {
		var eqs = this.equations;
		var i = eqs.indexOf(eq);
		if(i !== -1) eqs.splice( i, 1 );
	}
	
	removeAllEquations() { this.equations.length = 0 }
}
