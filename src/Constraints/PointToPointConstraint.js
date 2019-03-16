import * as THREE		from 'three';
import { Constraint }	from './Constraint';
import { ConeEquation }	from '../Equations/ConeEquation';

export class PointToPointConstraint extends Constraint {
	constructor(bodyA, pivotA, bodyB, pivotB, maxForce) {
		super(bodyA, bodyB);
		maxForce = typeof(maxForce) !== 'undefined' ? maxForce : 1e6;
		this.pivotA = pivotA ? pivotA.clone() : new THREE.Vector3();
		this.pivotB = pivotB ? pivotB.clone() : new THREE.Vector3();
		var x = this.equationX = new ContactEquation(bodyA, bodyB);
		var y = this.equationY = new ContactEquation(bodyA, bodyB);
		var z = this.equationZ = new ContactEquation(bodyA, bodyB);
		this.equations.push(x, y, z);
		x.minForce = y.minForce = z.minForce = -maxForce;
		x.maxForce = y.maxForce = z.maxForce =  maxForce;
		x.ni.set(1, 0, 0);
		y.ni.set(0, 1, 0);
		z.ni.set(0, 0, 1);
	}
	update() {
		var bodyA = this.bodyA;
		var bodyB = this.bodyB;
		var x = this.equationX;
		var y = this.equationY;
		var z = this.equationZ;

		// Rotate the pivots to world space
		bodyA.quaternion.vmult(this.pivotA,x.ri);
		bodyB.quaternion.vmult(this.pivotB,x.rj);

		y.ri.copy(x.ri);
		y.rj.copy(x.rj);
		z.ri.copy(x.ri);
		z.rj.copy(x.rj);
	}
}
