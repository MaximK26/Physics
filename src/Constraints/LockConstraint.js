import * as THREE					from 'three';
import { Constraint }				from './Constraint';
import { PointToPointConstraint }	from './PointToPointConstraint';
import { RotationalEquation }		from '../Equations/RotationalEquation';
import { RotationalMotorEquation }	from '../Equations/RotationalMotorEquation';
import { ContactEquation }			from '../Equations/ContactEquation';

export class LockConstraint extends PointToPointConstraint {
	constructor(bodyA, bodyB, options) {
		options = options || {};
		var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;
		// Set pivot point in between
		var pivotA = new THREE.Vector3();
		var pivotB = new THREE.Vector3();
		var halfWay = new THREE.Vector3();
		bodyA.position.vadd(bodyB.position, halfWay);
		halfWay.scale(0.5, halfWay);
		bodyB.pointToLocalFrame(halfWay, pivotB);
		bodyA.pointToLocalFrame(halfWay, pivotA);
		// The point-to-point constraint will keep a point shared between the bodies
		PointToPointConstraint.call(this, bodyA, pivotA, bodyB, pivotB, maxForce);
		// Store initial rotation of the bodies as unit vectors in the local body spaces
		this.xA = bodyA.vectorToLocalFrame(Vec3.UNIT_X);
		this.xB = bodyB.vectorToLocalFrame(Vec3.UNIT_X);
		this.yA = bodyA.vectorToLocalFrame(Vec3.UNIT_Y);
		this.yB = bodyB.vectorToLocalFrame(Vec3.UNIT_Y);
		this.zA = bodyA.vectorToLocalFrame(Vec3.UNIT_Z);
		this.zB = bodyB.vectorToLocalFrame(Vec3.UNIT_Z);
		var r1 = this.rotationalEquation1 = new RotationalEquation(bodyA,bodyB,options);
		var r2 = this.rotationalEquation2 = new RotationalEquation(bodyA,bodyB,options);
		var r3 = this.rotationalEquation3 = new RotationalEquation(bodyA,bodyB,options);
		this.equations.push(r1, r2, r3);
	}
	update() {
		var bodyA = this.bodyA,
			bodyB = this.bodyB,
			motor = this.motorEquation,
			r1 = this.rotationalEquation1,
			r2 = this.rotationalEquation2,
			r3 = this.rotationalEquation3,
			worldAxisA = new THREE.Vector3(),
			worldAxisB = new THREE.Vector3();
		super.update();
		// These vector pairs must be orthogonal
		bodyA.vectorToWorldFrame(this.xA, r1.axisA);
		bodyB.vectorToWorldFrame(this.yB, r1.axisB);
		bodyA.vectorToWorldFrame(this.yA, r2.axisA);
		bodyB.vectorToWorldFrame(this.zB, r2.axisB);
		bodyA.vectorToWorldFrame(this.zA, r3.axisA);
		bodyB.vectorToWorldFrame(this.xB, r3.axisB);
	}
}
