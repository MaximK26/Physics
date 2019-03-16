import * as THREE	from 'three';
import { Equation }	from './Equation';

export class ContactEquation extends Equation {
	constructor(bodyA, bodyB, maxForce) {
		maxForce = typeof(maxForce) !== 'undefined' ? maxForce : 1e6;
		super( bodyA, bodyB, 0, maxForce );
		this.restitution = 0.0; // "bounciness": u1 = -e*u0
		this.ri = new THREE.Vector3();
		this.rj = new THREE.Vector3();
		this.ni = new THREE.Vector3();
	}
	
	computeB(h) {
		var a = this.a, b = this.b,
			bi = this.bi, bj = this.bj,
			ri = this.ri, rj = this.rj,
			rixn = new THREE.Vector3(),
			rjxn = new THREE.Vector3(),
			vi = bi.velocity,
			wi = bi.angularVelocity,
			fi = bi.force,
			taui = bi.torque,
			vj = bj.velocity,
			wj = bj.angularVelocity,
			fj = bj.force,
			tauj = bj.torque,
			penetrationVec = new THREE.Vector3(),
			GA = this.jacobianElementA,
			GB = this.jacobianElementB,
			n = this.ni;
		// Caluclate cross products
		rixn.crossVectors( ri, n );
		rjxn.crossVectors( rj, n );
		// g = xj+rj -(xi+ri)
		// G = [ -ni  -rixn  ni  rjxn ]
		GA.spatial.copy( n ).negate();
		GA.rotational.copy( rixn ).negate();
		GB.spatial.copy( n );
		GB.rotational.copy( rjxn );
		// Calculate the penetration vector
		penetrationVec.copy( bj.position );
		penetrationVec.addVectors( rj, penetrationVec );
		penetrationVec.subVectors( bi.position, penetrationVec );
		penetrationVec.subVectors( ri, penetrationVec );
		var g = n.dot(penetrationVec);
		// Compute iteration
		var ePlusOne = this.restitution + 1;
		var GW = ePlusOne * vj.dot(n) - ePlusOne * vi.dot(n) + wj.dot(rjxn) - wi.dot(rixn);
		var GiMf = this.computeGiMf();
		var B = - g * a - GW * b - h*GiMf;
		return B;
	}
	
	getImpactVelocityAlongNormal() {
		var vi = new THREE.Vector3();
		var vj = new THREE.Vector3();
		var xi = new THREE.Vector3();
		var xj = new THREE.Vector3();
		var relVel = new THREE.Vector3();
		xi.addVectors( this.bi.position, this.ri );
		xj.addVectors( this.bj.position, this.rj );
		this.bi.getVelocityAtWorldPoint(xi, vi);
		this.bj.getVelocityAtWorldPoint(xj, vj);
		relVel.subVectors( vi, vj );
		return this.ni.dot(relVel);
	}
	
}
