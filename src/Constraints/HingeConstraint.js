import * as THREE					from 'three';
import { Constraint }				from './Constraint';
import { PointToPointConstraint }	from './PointToPointConstraint';
import { RotationalEquation }		from '../Equations/RotationalEquation';
import { RotationalMotorEquation }	from '../Equations/RotationalMotorEquation';
import { ContactEquation }			from '../Equations/ContactEquation';

export class HingeConstraint extends PointToPointConstraint {
	constructor(bodyA, bodyB, options) {
		options = options || {};
		var maxForce = typeof(options.maxForce) !== 'undefined' ? options.maxForce : 1e6;
		var pivotA = options.pivotA ? options.pivotA.clone() : new THREE.Vector3();
		var pivotB = options.pivotB ? options.pivotB.clone() : new THREE.Vector3();
		super(bodyA, pivotA, bodyB, pivotB, maxForce);
		var axisA = this.axisA = options.axisA ? options.axisA.clone() : new THREE.Vector3(1,0,0);
		axisA.normalize();
		var axisB = this.axisB = options.axisB ? options.axisB.clone() : new THREE.Vector3(1,0,0);
		axisB.normalize();
		var r1 = this.rotationalEquation1 = new RotationalEquation(bodyA,bodyB,options);
		var r2 = this.rotationalEquation2 = new RotationalEquation(bodyA,bodyB,options);
		var motor = this.motorEquation = new RotationalMotorEquation(bodyA,bodyB,maxForce);
		motor.enabled = false; // Not enabled by default
		// Equations to be fed to the solver
		this.equations.push(
			r1, // rotational1
			r2, // rotational2
			motor
		);
	}
	enableMotor() {	this.motorEquation.enabled = true };
	disableMotor() { this.motorEquation.enabled = false; };
	setMotorSpeed(speed) { this.motorEquation.targetVelocity = speed; };
	setMotorMaxForce(maxForce) {
		this.motorEquation.maxForce = maxForce;
		this.motorEquation.minForce = -maxForce;
	}
	update() {
		var bodyA = this.bodyA,
			bodyB = this.bodyB,
			motor = this.motorEquation,
			r1 = this.rotationalEquation1,
			r2 = this.rotationalEquation2,
			worldAxisA = new THREE.Vector3(),
			worldAxisB = new THREE.Vector3();
		var axisA = this.axisA;
		var axisB = this.axisB;
		super.update();
		// Get world axes
		bodyA.quaternion.vmult(axisA, worldAxisA);
		bodyB.quaternion.vmult(axisB, worldAxisB);
		worldAxisA.tangents(r1.axisA, r2.axisA);
		r1.axisB.copy(worldAxisB);
		r2.axisB.copy(worldAxisB);
		if(this.motorEquation.enabled){
			bodyA.quaternion.vmult(this.axisA, motor.axisA);
			bodyB.quaternion.vmult(this.axisB, motor.axisB);
		}
	}
}
