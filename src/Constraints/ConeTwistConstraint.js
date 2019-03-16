import * as THREE					from 'three';
import { Constraint }				from './Constraint';
import { PointToPointConstraint }	from './PointToPointConstraint';
import { ConeEquation }				from '../Equations/ConeEquation';
import { RotationalEquation }		from '../Equations/RotationalEquation';
import { ContactEquation }			from '../Equations/ContactEquation';

export class ConeTwistConstraint extends PointToPointConstraint {
	constructor(bodyA, bodyB, options) {
		options = options || {};
		var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;
		// Set pivot point in between
		var pivotA = options.pivotA ? options.pivotA.clone() : new Vec3();
		var pivotB = options.pivotB ? options.pivotB.clone() : new Vec3();
		this.axisA = options.axisA ? options.axisA.clone() : new Vec3();
		this.axisB = options.axisB ? options.axisB.clone() : new Vec3();
		super(bodyA, pivotA, bodyB, pivotB, maxForce);
		this.collideConnected = !!options.collideConnected;
		this.angle = typeof(options.angle) !== 'undefined' ? options.angle : 0;
		var c = this.coneEquation = new ConeEquation(bodyA,bodyB,options);
		var t = this.twistEquation = new RotationalEquation(bodyA,bodyB,options);
		this.twistAngle = typeof(options.twistAngle) !== 'undefined' ? options.twistAngle : 0;
		c.maxForce = 0;
		c.minForce = -maxForce;
		t.maxForce = 0;
		t.minForce = -maxForce;
		this.equations.push(c, t);
	}
	update() {
		var bodyA = this.bodyA,
			bodyB = this.bodyB,
			cone = this.coneEquation,
			twist = this.twistEquation;
		super.update();
		// Update the axes to the cone constraint
		bodyA.vectorToWorldFrame(this.axisA, cone.axisA);
		bodyB.vectorToWorldFrame(this.axisB, cone.axisB);
		// Update the world axes in the twist constraint
		this.axisA.tangents(twist.axisA, twist.axisA);
		bodyA.vectorToWorldFrame(twist.axisA, twist.axisA);
		this.axisB.tangents(twist.axisB, twist.axisB);
		bodyB.vectorToWorldFrame(twist.axisB, twist.axisB);
		cone.angle = this.angle;
		twist.maxAngle = this.twistAngle;
	}
}
