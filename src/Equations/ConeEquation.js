import * as THREE	from 'three';
import { Equation }	from './Equation';

export class ConeEquation extends Equation {
	constructor(bodyA, bodyB, options) {
		options = options || {};
		var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;
		super(bodyA, bodyB, -maxForce, maxForce);
		this.axisA = options.axisA ? options.axisA.clone() : new THREE.Vector3(1, 0, 0);
		this.axisB = options.axisB ? options.axisB.clone() : new THREE.Vector3(0, 1, 0);
		this.angle = typeof(options.angle) !== 'undefined' ? options.angle : 0;
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
		GA.rotational.copy(njxni);
		GB.rotational.copy(nixnj);
		var g = Math.cos(this.angle) - ni.dot(nj),
			GW = this.computeGW(),
			GiMf = this.computeGiMf();
		var B = - g * a - GW * b - h * GiMf;
		return B;
	}
}
