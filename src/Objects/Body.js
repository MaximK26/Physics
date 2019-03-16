import * as THREE			from 'three';
import { Transform }		from '../Math/Transform';
import { EventTarget }		from '../Utils/EventTarget';
import { Shape }			from '../Shapes/Shape';
import { Material }			from '../Material/Material';
import { AABB }				from '../Collision/AABB';
import { Box }				from '../Shapes/Box';

export class Body extends EventTarget {
	constructor(options) {
		options 					= options || {};
		super();
		this.id						= Body.idCounter++;
		this.world					= null;
		this.preStep				= null;
		this.postStep				= null;
		this.vlambda				= new THREE.Vector3();
		this.collisionFilterGroup	= typeof(options.collisionFilterGroup) === 'number' ? options.collisionFilterGroup : 1;
		this.collisionFilterMask	= typeof(options.collisionFilterMask) === 'number' ? options.collisionFilterMask : -1;
		this.collisionResponse		= true;
		this.position				= options.position ? new THREE.Vector3().copy(options.position) : new THREE.Vector3();
		this.previousPosition		= options.position ? new THREE.Vector3().copy(options.position) : new THREE.Vector3();
		this.interpolatedPosition	= options.position ? new THREE.Vector3().copy(options.position) : new THREE.Vector3();
		this.initPosition			= options.position ? new THREE.Vector3().copy(options.position) : new THREE.Vector3();
		this.velocity				= options.velocity ? new THREE.Vector3().copy(options.velocity) : new THREE.Vector3();
		this.initVelocity			= new THREE.Vector3();
		this.force					= new THREE.Vector3();

		var mass = typeof(options.mass) === 'number' ? options.mass : 0;

		this.mass 					= mass;
		this.invMass 				= mass > 0 ? 1.0 / mass : 0;
		this.material				= options.material || null;
		this.linearDamping 			= typeof(options.linearDamping) === 'number' ? options.linearDamping : 0.01;
		this.type					= mass <= 0.0 ? Body.STATIC : Body.DYNAMIC;
		if(typeof(options.type) === typeof(Body.STATIC)) this.type = options.type;

		this.allowSleep				= typeof(options.allowSleep) !== 'undefined' ? options.allowSleep : true;
		this.sleepState				= 0;
		this.sleepSpeedLimit		= typeof(options.sleepSpeedLimit) !== 'undefined' ? options.sleepSpeedLimit : 0.1;
		this.sleepTimeLimit			= typeof(options.sleepTimeLimit) !== 'undefined' ? options.sleepTimeLimit : 1;
		this.timeLastSleepy			= 0;
		this._wakeUpAfterNarrowphase = false;
		this.torque					= new THREE.Vector3();
		this.quaternion				= options.quaternion ? new THREE.Quaternion().copy(options.quaternion) : new THREE.Quaternion();
		this.initQuaternion			= options.quaternion ? new THREE.Quaternion().copy(options.quaternion) : new THREE.Quaternion();
		this.previousQuaternion		= options.quaternion ? new THREE.Quaternion().copy(options.quaternion) : new THREE.Quaternion();
		this.interpolatedQuaternion = options.quaternion ? new THREE.Quaternion().copy(options.quaternion) : new THREE.Quaternion();
		this.angularVelocity		= options.angularVelocity ? new THREE.Vector3().copy(options.angularVelocity) : new THREE.Vector3();
		this.initAngularVelocity	= new THREE.Vector3();
		this.shapes 				= [];
		this.shapeOffsets			= [];
		this.shapeOrientations		= [];
		this.inertia				= new THREE.Vector3();
		this.invInertia				= new THREE.Vector3();
		this.invInertiaWorld		= new THREE.Matrix3();
		this.invMassSolve			= 0;
		this.invInertiaSolve		= new THREE.Vector3();
		this.invInertiaWorldSolve	= new THREE.Matrix3();
		this.fixedRotation			= typeof(options.fixedRotation) !== "undefined" ? options.fixedRotation : false;
		this.angularDamping			= typeof(options.angularDamping) !== 'undefined' ? options.angularDamping : 0.01;
		this.linearFactor			= options.linearFactor ? new THREE.Vector3().copy(options.linearFactor) : new THREE.Vector3(1, 1, 1);
		this.angularFactor			= options.angularFactor ? new THREE.Vector3().copy(options.angularFactor) : new THREE.Vector3(1, 1, 1);
		this.aabb					= new AABB();
		this.aabbNeedsUpdate		= true;
		this.boundingRadius			= 0;
		this.wlambda				= new THREE.Vector3();

		options.shape ? this.addShape(options.shape) : !0;

		this.updateMassProperties();
	}
	
	wakeUp() {
		var s = this.sleepState;
		this.sleepState = 0;
		this._wakeUpAfterNarrowphase = false;
		if(s === Body.SLEEPING) this.dispatchEvent(Body.wakeupEvent);
	}
	
	sleep() {
		this.sleepState = Body.SLEEPING;
		this.velocity.set( 0, 0, 0 );
		this.angularVelocity.set( 0, 0, 0 );
		this._wakeUpAfterNarrowphase = false;
	}
	
	sleepTick( time ) {
		if(this.allowSleep){
			var sleepState = this.sleepState;
			var speedSquared = this.velocity.lengthSq() + this.angularVelocity.lengthSq();
			var speedLimitSquared = Math.pow( this.sleepSpeedLimit, 2 );
			if(sleepState === Body.AWAKE && speedSquared < speedLimitSquared){
				this.sleepState = Body.SLEEPY; // Sleepy
				this.timeLastSleepy = time;
				this.dispatchEvent(Body.sleepyEvent);
			} else if(sleepState === Body.SLEEPY && speedSquared > speedLimitSquared){
				this.wakeUp(); // Wake up
			} else if(sleepState === Body.SLEEPY && (time - this.timeLastSleepy ) > this.sleepTimeLimit){
				this.sleep(); // Sleeping
				this.dispatchEvent(Body.sleepEvent);
			}
		}
	}
	
	updateSolveMassProperties() {
		if(this.sleepState === Body.SLEEPING || this.type === Body.KINEMATIC) {
			this.invMassSolve = 0;
			this.invInertiaSolve.set( 0, 0, 0 );
			this.invInertiaWorldSolve.set( 0, 0, 0, 0, 0, 0, 0, 0, 0 );
		} else {
			this.invMassSolve = this.invMass;
			this.invInertiaSolve.copy(this.invInertia);
			this.invInertiaWorldSolve.copy(this.invInertiaWorld);
		}
	}
	
	pointToLocalFrame( worldPoint, result ) {
		let quad = new THREE.Quaternion()
							.copy( this.quaternion )
							.conjugate();
		result = new THREE.Vector3()
							.subVectors( worldPoint, this.position )
							.applyQuaternion(quad);
		return result;
	}
	
	vectorToLocalFrame( worldVector, result ) {
		let quad = new THREE.Quaternion()
							.copy( this.quaternion )
							.conjugate();
		result = new THREE.Vector3()
							.copy( worldVector )
							.applyQuaternion(quad);
		return result;
	}
	
	pointToWorldFrame( localPoint, result ) {
		result = new THREE.Vector3()
							.copy( localPoint )
							.applyQuaternion( this.quaternion );
		result.subVectors( this.position, result );
		return result;
	}
	
	vectorToWorldFrame( localVector, result ){
		result = new THREE.Vector3()
							.copy( localVector )
							.applyQuaternion( this.quaternion );
		return result;
	}
	
	addShape( shape, _offset, _orientation ) {
		var offset		= _offset      ? new THREE.Vector3().copy(_offset)    : new THREE.Vector3();
		var orientation = _orientation ? new THREE.Quaternion().copy(_offset) : new THREE.Quaternion();
		this.shapes.push( shape );
		this.shapeOffsets.push( offset );
		this.shapeOrientations.push( orientation );
		this.updateMassProperties();
		this.updateBoundingRadius();
		this.aabbNeedsUpdate = true;
		shape.body = this;
		return this;
	}
	
	updateBoundingRadius() {
		var shapes 			= this.shapes,
			shapeOffsets	= this.shapeOffsets,
			N				= shapes.length,
			radius			= 0;
		for(var i = 0; i < N; i++) {
			var shape = shapes[i];
			shape.updateBoundingSphereRadius();
			var offset = shapeOffsets[i].length(),
				r = shape.boundingSphereRadius;
			if(offset + r > radius) radius = offset + r;
		}
		this.boundingRadius = radius;
	}
	
	computeAABB() {
		var shapes				= this.shapes,
			shapeOffsets		= this.shapeOffsets,
			shapeOrientations	= this.shapeOrientations,
			N					= shapes.length,
			offset				= new THREE.Vector3(),
			orientation			= new THREE.Quaternion(),
			bodyQuat			= this.quaternion,
			aabb				= this.aabb,
			shapeAABB			= new AABB();
		for(var i = 0; i < N; i++) {
			var shape = shapes[i];
			// Get shape world position
			offset = new THREE.Vector3().copy( shapeOffsets[i] ).applyQuaternion( bodyQuat );
			offset.addVectors( this.position, offset );
			// Get shape world quaternion
			orientation.multiplyQuaternions( shapeOrientations[i], bodyQuat );
			// Get shape AABB
			shape.calculateWorldAABB( offset, orientation, shapeAABB.lowerBound, shapeAABB.upperBound );
			if(i === 0) aabb.copy(shapeAABB); else aabb.extend(shapeAABB);
		}
		this.aabbNeedsUpdate = false;
	}
	
	updateInertiaWorld( force ) {
		function msv( v, target ) {
			target = target || new THREE.Matrix3();
			//var e = this.elements,
			var t = target.elements;
			for(var i=0; i!==3; i++){
				t[3*i + 0] = v.x * t[3*i + 0];
				t[3*i + 1] = v.y * t[3*i + 1];
				t[3*i + 2] = v.z * t[3*i + 2];
			}
			return target;
		};
		var I = this.invInertia;
		if (I.x === I.y && I.y === I.z && !force) {
			// If inertia M = s*I, where I is identity and s a scalar, then
			//    R*M*R' = R*(s*I)*R' = s*R*I*R' = s*R*R' = s*I = M
			// where R is the rotation matrix.
			// In other words, we don't have to transform the inertia if all
			// inertia diagonal entries are equal.
		} else {
			var m1 = new THREE.Matrix3();
			var m2 = new THREE.Matrix3();
			Transform.setRotationFromQuaternion( m1, this.quaternion );
			m2.copy(m1).transpose();
			msv( I, m1 );
			this.invInertiaWorld.multiplyMatrices( m1, m2 );
		}
	}
	
	applyForce( force, relativePoint ) {
		if(this.type !== Body.DYNAMIC) return;
		// Compute produced rotational force
		let rotForce = new THREE.Vector3().crossVectors( relativePoint, force );
		// Add linear force
		this.force.addVectors( force, this.force );
		// Add rotational force
		this.torque.addVectors( rotForce, this.torque );
	}
	
	applyLocalForce( localForce, localPoint ) {
		if(this.type !== Body.DYNAMIC) return;
		var worldForce = new THREE.Vector3();
		var relativePointWorld =  new THREE.Vector3();
		// Transform the force vector to world space
		this.vectorToWorldFrame( localForce, worldForce );
		this.vectorToWorldFrame( localPoint, relativePointWorld );
		this.applyForce( worldForce, relativePointWorld );
	}
	
	applyImpulse( impulse, relativePoint ) {
		if(this.type !== Body.DYNAMIC) return;
		// Compute point position relative to the body center
		var r = relativePoint;
		// Compute produced central impulse velocity
		var velo = new THREE.Vector3().copy( impulse );
		velo.multiplyScalar( this.invMass );
		// Add linear impulse
		this.velocity.addVectors( velo, this.velocity );
		// Compute produced rotational impulse velocity
		var rotVelo = new THREE.Vector3().crossVectors(	r, impulse ).applyMatrix3( this.invInertiaWorld );
		// Add rotational Impulse
		this.angularVelocity.addVectors( rotVelo, this.angularVelocity );
	}
	
	applyLocalImpulse( localImpulse, localPoint ) {
		if(this.type !== Body.DYNAMIC) return;
		var worldImpulse = new THREE.Vector3();
		var relativePointWorld = new THREE.Vector3();
		// Transform the force vector to world space
		this.vectorToWorldFrame( localImpulse, worldImpulse );
		this.vectorToWorldFrame( localPoint, relativePointWorld );
		this.applyImpulse( worldImpulse, relativePointWorld );
	}
	
	updateMassProperties() {
		var halfExtents = new THREE.Vector3();
		this.invMass = this.mass > 0 ? 1.0 / this.mass : 0;
		var I = this.inertia;
		var fixed = this.fixedRotation;
		// Approximate with AABB box
		this.computeAABB();
		halfExtents.set(
			(this.aabb.upperBound.x-this.aabb.lowerBound.x) / 2,
			(this.aabb.upperBound.y-this.aabb.lowerBound.y) / 2,
			(this.aabb.upperBound.z-this.aabb.lowerBound.z) / 2
		);
		Box.calculateInertia( halfExtents, this.mass, I );
		this.invInertia.set(
			I.x > 0 && !fixed ? 1.0 / I.x : 0,
			I.y > 0 && !fixed ? 1.0 / I.y : 0,
			I.z > 0 && !fixed ? 1.0 / I.z : 0
		);
		this.updateInertiaWorld(true);
	}
	
	getVelocityAtWorldPoint( worldPoint, result ) {
		var r = new THREE.Vector3().subVectors( worldPoint, this.position);
		result.crossVectors( this.angularVelocity, r );
		result.addVectors( this.velocity, result );
		return result;
	}
	
	integrate( dt, quatNormalize, quatNormalizeFast ) {
		//console.log( 'body.integrate', dt, quatNormalize, quatNormalizeFast );
		// Save previous position
		this.previousPosition.copy( this.position );
		this.previousQuaternion.copy( this.quaternion );
		if(!(this.type === Body.DYNAMIC || this.type === Body.KINEMATIC) || this.sleepState === Body.SLEEPING) return;
		var velo			= this.velocity,
			angularVelo 	= this.angularVelocity,
			pos				= this.position,
			force			= this.force,
			torque			= new THREE.Vector3(),
			quat			= this.quaternion,
			invMass			= this.invMass,
			invInertia		= this.invInertiaWorld,
			linearFactor	= this.linearFactor;
		//console.log( 'body.integrate', invInertia );
		var iMdt = invMass * dt;
		velo.x += force.x * iMdt * linearFactor.x;
		velo.y += force.y * iMdt * linearFactor.y;
		velo.z += force.z * iMdt * linearFactor.z;

		var e = invInertia.elements;
		var angularFactor = this.angularFactor;
		var tx = torque.x * angularFactor.x;
		var ty = torque.y * angularFactor.y;
		var tz = torque.z * angularFactor.z;
		angularVelo.x += dt * (e[0] * tx + e[1] * ty + e[2] * tz);
		angularVelo.y += dt * (e[3] * tx + e[4] * ty + e[5] * tz);
		angularVelo.z += dt * (e[6] * tx + e[7] * ty + e[8] * tz);
		// Use new velocity  - leap frog
		pos.x += velo.x * dt;
		pos.y += velo.y * dt;
		pos.z += velo.z * dt;

		quat.integrate( this.angularVelocity, dt, this.angularFactor, quat );

		if(quatNormalize)
			if(quatNormalizeFast) quat.normalizeFast(); else quat.normalize();
			
		this.aabbNeedsUpdate = true;
		// Update world inertia
		this.updateInertiaWorld();
	}
}
	
Body.COLLIDE_EVENT_NAME = "collide";
Body.DYNAMIC			= 1;
Body.STATIC				= 2;
Body.KINEMATIC			= 4;
Body.AWAKE				= 0;
Body.SLEEPY				= 1;
Body.SLEEPING			= 2;
Body.idCounter			= 0;
Body.wakeupEvent		= { type: "wakeup" };
Body.sleepyEvent		= { type: "sleepy" };
Body.sleepEvent			= { type: "sleep" };

