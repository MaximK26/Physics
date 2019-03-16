import * as THREE	from 'three';
import { Solver }	from './Solver';

export class GSSolver extends Solver {
	constructor() {
		super();
		this.iterations = 10;
		this.tolerance = 1e-7;
	}
	
	solve( dt, world ) {
		var GSSolver_solve_lambda = []; // Just temporary number holders that we want to reuse each solve.
		var GSSolver_solve_invCs = [];
		var GSSolver_solve_Bs = [];
		var iter = 0,
			maxIter = this.iterations,
			tolSquared = this.tolerance*this.tolerance,
			equations = this.equations,
			Neq = equations.length,
			bodies = world.bodies,
			Nbodies = bodies.length,
			h = dt,
			q, B, invC, deltalambda, deltalambdaTot, GWlambda, lambdaj;
		// Update solve mass
		if(Neq !== 0) {
			for(var i = 0; i < Nbodies; i++) bodies[i].updateSolveMassProperties();
		}
		// Things that does not change during iteration can be computed once
		var invCs = GSSolver_solve_invCs,
			Bs = GSSolver_solve_Bs,
			lambda = GSSolver_solve_lambda;
		invCs.length = Neq;
		Bs.length = Neq;
		lambda.length = Neq;
		for(var i = 0; i < Neq; i++){
			var c = equations[i];
			lambda[i] = 0.0;
			//console.log('solve', c); break;
			Bs[i] = c.computeB(h);
			invCs[i] = 1.0 / c.computeC();
		}
		if(Neq !== 0){
			// Reset vlambda
			for(var i = 0; i < Nbodies; i++) {
				var b = bodies[i],
					vlambda=b.vlambda,
					wlambda=b.wlambda;
				vlambda.set(0,0,0);
				wlambda.set(0,0,0);
			}

			// Iterate over equations
			for(iter = 0; iter < maxIter; iter++) {

				// Accumulate the total error for each iteration.
				deltalambdaTot = 0.0;

				for(var j = 0; j < Neq; j++) {

					var c = equations[j];

					// Compute iteration
					B = Bs[j];
					invC = invCs[j];
					lambdaj = lambda[j];
					GWlambda = c.computeGWlambda();
					deltalambda = invC * ( B - GWlambda - c.eps * lambdaj );

					// Clamp if we are not within the min/max interval
					if(lambdaj + deltalambda < c.minForce) { deltalambda = c.minForce - lambdaj; } else
					if(lambdaj + deltalambda > c.maxForce) { deltalambda = c.maxForce - lambdaj; }
					lambda[j] += deltalambda;

					deltalambdaTot += deltalambda > 0.0 ? deltalambda : -deltalambda; // abs(deltalambda)

					c.addToWlambda(deltalambda);
				}

				// If the total error is small enough - stop iterate
				if(deltalambdaTot * deltalambdaTot < tolSquared) {
					break;
				}
			}

			// Add result to velocity
			for(var i = 0; i < Nbodies; i++) {
				var b = bodies[i],
					v = b.velocity,
					w = b.angularVelocity;

				b.vlambda.multiplyVectors( b.vlambda, b.linearFactor );
				v.addVectors( b.vlambda, v );

				b.wlambda.multiplyVectors( b.wlambda, b.angularFactor );
				w.addVectors( b.wlambda, w );
			}

			// Set the .multiplier property of each equation
			var l = equations.length;
			var invDt = 1 / h;
			while(l--){
				equations[l].multiplier = lambda[l] * invDt;
			}
		}

		return iter;
	}
	
}
