import * as THREE	from 'three';
import { Equation }	from './Equation';

export class RotationalMotorEquation extends Equation {
	constructor(bodyA, bodyB, maxForce) {
		maxForce = typeof(maxForce)!=='undefined' ? maxForce : 1e6;
		Equation.call(this,bodyA,bodyB,-maxForce,maxForce);
		this.axisA = new THREE.Vector3();
		this.axisB = new THREE.Vector3(); // World oriented rotational axis
		this.targetVelocity = 0;
	}
	computeB(h) {
		var a = this.a,	b = this.b,
			bi = this.bi, bj = this.bj,
			axisA = this.axisA,
			axisB = this.axisB,
			GA = this.jacobianElementA,
			GB = this.jacobianElementB;
		// g = 0
		// gdot = axisA * wi - axisB * wj
		// gdot = G * W = G * [vi wi vj wj]
		// =>
		// G = [0 axisA 0 -axisB]
		GA.rotational.copy(axisA);
		axisB.negate(GB.rotational);
		var GW = this.computeGW() - this.targetVelocity,
			GiMf = this.computeGiMf();
		var B = - GW * b - h * GiMf;
		return B;
	}
}