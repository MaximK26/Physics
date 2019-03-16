import { Constraint }		from './Constraint';
import { ContactEquation }	from '../Equations/ContactEquation';

export class DistanceConstraint extends Constraint {
	constructor(bodyA, bodyB, distance, maxForce) {
		super(bodyA, bodyB);
		if(typeof(distance)==="undefined") distance = bodyA.position.distanceTo(bodyB.position);
		if(typeof(maxForce)==="undefined") maxForce = 1e6;
		this.distance = distance;
		var eq = this.distanceEquation = new ContactEquation(bodyA, bodyB);
		this.equations.push(eq);
		// Make it bidirectional
		eq.minForce = -maxForce;
		eq.maxForce =  maxForce;
	}
	update() {
		var bodyA = this.bodyA;
		var bodyB = this.bodyB;
		var eq = this.distanceEquation;
		var halfDist = this.distance * 0.5;
		var normal = eq.ni;
		bodyB.position.vsub(bodyA.position, normal);
		normal.normalize();
		normal.mult(halfDist, eq.ri);
		normal.mult(-halfDist, eq.rj);
	}
}
