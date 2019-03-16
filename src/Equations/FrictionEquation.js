import * as THREE	from 'three';
import { Equation }	from './Equation';

export class FrictionEquation extends Equation {
	constructor(bodyA, bodyB, slipForce) {
		super(bodyA, bodyB, -slipForce, slipForce);
		this.ri = new THREE.Vector3();
		this.rj = new THREE.Vector3();
		this.t = new THREE.Vector3(); // tangent
	}
	computeB(h) {
		var a = this.a,	b = this.b,
			bi = this.bi, bj = this.bj,
			ri = this.ri, rj = this.rj,
			rixt =  new THREE.Vector3(),
			rjxt =  new THREE.Vector3(),
			t = this.t;
		// Caluclate cross products
		rixt.crossVectors( ri, t );
		rjxt.crossVectors( rj, t );
		// G = [-t -rixt t rjxt]
		// And remember, this is a pure velocity constraint, g is always zero!
		var GA = this.jacobianElementA,
			GB = this.jacobianElementB;
		t.negate(GA.spatial);
		rixt.negate(GA.rotational);
		GB.spatial.copy(t);
		GB.rotational.copy(rjxt);
		var GW = this.computeGW();
		var GiMf = this.computeGiMf();
		var B = - GW * b - h * GiMf;
		return B;
	}
}
