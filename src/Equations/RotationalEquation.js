import * as THREE	from 'three';
import { Equation }	from './Equation';

export class RotationalEquation extends Equation {
	constructor(bodyA, bodyB, options) {
		options = options || {};
		var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;
		Equation.call(this,bodyA,bodyB,-maxForce, maxForce);
		this.axisA = options.axisA ? options.axisA.clone() : new THREE.Vector3(1, 0, 0);
		this.axisB = options.axisB ? options.axisB.clone() : new THREE.Vector3(0, 1, 0);
		this.maxAngle = Math.PI / 2;
	}
	computeB(h) {
		var a = this.a,	b = this.b,
			ni = this.axisA, nj = this.axisB,
			nixnj = new THREE.Vector3(),
			njxni = new THREE.Vector3(),
			GA = this.jacobianElementA,
			GB = this.jacobianElementB;
		// Caluclate cross products
		nixnj.crossVectors( ni, nj );
		njxni.crossVectors( nj, ni );
		// g = ni * nj
		// gdot = (nj x ni) * wi + (ni x nj) * wj
		// G = [0 njxni 0 nixnj]
		// W = [vi wi vj wj]
		GA.rotational.copy(njxni);
		GB.rotational.copy(nixnj);
		var g = Math.cos(this.maxAngle) - ni.dot(nj),
			GW = this.computeGW(),
			GiMf = this.computeGiMf();
		var B = - g * a - GW * b - h * GiMf;
		return B;
	}
}
