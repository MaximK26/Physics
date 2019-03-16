import * as THREE		from 'three';

export class Spring {
	constructor(bodyA, bodyB, options) {
		options = options || {};
		this.restLength = typeof(options.restLength) === "number" ? options.restLength : 1;
		this.stiffness = options.stiffness || 100;
		this.damping = options.damping || 1;
		this.bodyA = bodyA;
		this.bodyB = bodyB;
		this.localAnchorA = new THREE.Vector3();
		this.localAnchorB = new THREE.Vector3();
		if(options.localAnchorA) this.localAnchorA.copy(options.localAnchorA);
		if(options.localAnchorB) this.localAnchorB.copy(options.localAnchorB);
		if(options.worldAnchorA) this.setWorldAnchorA(options.worldAnchorA);
		if(options.worldAnchorB) this.setWorldAnchorB(options.worldAnchorB);
	}
	setWorldAnchorA(worldAnchorA) {	this.bodyA.pointToLocalFrame(worldAnchorA,this.localAnchorA) };
	setWorldAnchorB(worldAnchorB) { this.bodyB.pointToLocalFrame(worldAnchorB,this.localAnchorB) };
	getWorldAnchorA(result) { this.bodyA.pointToWorldFrame(this.localAnchorA,result) };
	getWorldAnchorB(result) { this.bodyB.pointToWorldFrame(this.localAnchorB,result) };
	applyForce() {
		var applyForce_r =              new THREE.Vector3(),
			applyForce_r_unit =         new THREE.Vector3(),
			applyForce_u =              new THREE.Vector3(),
			applyForce_f =              new THREE.Vector3(),
			applyForce_worldAnchorA =   new THREE.Vector3(),
			applyForce_worldAnchorB =   new THREE.Vector3(),
			applyForce_ri =             new THREE.Vector3(),
			applyForce_rj =             new THREE.Vector3(),
			applyForce_ri_x_f =         new THREE.Vector3(),
			applyForce_rj_x_f =         new THREE.Vector3(),
			applyForce_tmp =            new THREE.Vector3();
		var k = this.stiffness,
			d = this.damping,
			l = this.restLength,
			bodyA = this.bodyA,
			bodyB = this.bodyB,
			r = applyForce_r,
			r_unit = applyForce_r_unit,
			u = applyForce_u,
			f = applyForce_f,
			tmp = applyForce_tmp;

		var worldAnchorA = applyForce_worldAnchorA,
			worldAnchorB = applyForce_worldAnchorB,
			ri = applyForce_ri,
			rj = applyForce_rj,
			ri_x_f = applyForce_ri_x_f,
			rj_x_f = applyForce_rj_x_f;

		// Get world anchors
		this.getWorldAnchorA(worldAnchorA);
		this.getWorldAnchorB(worldAnchorB);

		// Get offset points
		worldAnchorA.vsub(bodyA.position,ri);
		worldAnchorB.vsub(bodyB.position,rj);

		// Compute distance vector between world anchor points
		worldAnchorB.vsub(worldAnchorA,r);
		var rlen = r.norm();
		r_unit.copy(r);
		r_unit.normalize();

		// Compute relative velocity of the anchor points, u
		bodyB.velocity.vsub(bodyA.velocity,u);
		// Add rotational velocity

		bodyB.angularVelocity.cross(rj,tmp);
		u.vadd(tmp,u);
		bodyA.angularVelocity.cross(ri,tmp);
		u.vsub(tmp,u);

		// F = - k * ( x - L ) - D * ( u )
		r_unit.mult(-k*(rlen-l) - d*u.dot(r_unit), f);

		// Add forces to bodies
		bodyA.force.vsub(f,bodyA.force);
		bodyB.force.vadd(f,bodyB.force);

		// Angular force
		ri.cross(f,ri_x_f);
		rj.cross(f,rj_x_f);
		bodyA.torque.vsub(ri_x_f,bodyA.torque);
		bodyB.torque.vadd(rj_x_f,bodyB.torque);
	}
}