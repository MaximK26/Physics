import * as THREE				from 'three';
import { Shape }	 			from '../Shapes/Shape';
import { GSSolver }				from '../Solver/GSSolver';
import { ContactEquation }		from '../Equations/ContactEquation';
import { FrictionEquation }		from '../Equations/FrictionEquation';
import { Narrowphase }	 		from './Narrowphase';
import { EventTarget }	 		from '../Utils/EventTarget';
import { ArrayCollisionMatrix }	from '../Collision/ArrayCollisionMatrix';
import { OverlapKeeper }		from '../Collision/OverlapKeeper';
import { Material }				from '../Material/Material';
import { ContactMaterial }		from '../Material/ContactMaterial';
import { Body }					from '../Objects/Body';
import { TupleDictionary }		from '../Utils/TupleDictionary';
import { RaycastResult }		from '../Collision/RaycastResult';
import { AABB }					from '../Collision/AABB';
import { Ray }					from '../Collision/Ray';
import { NaiveBroadphase }		from '../Collision/NaiveBroadphase';

export class World extends EventTarget {
	constructor(options) {
		options = options || {};
		super();
		this.dt							= -1;
		this.allowSleep					= !!options.allowSleep;
		this.contacts					= [];
		this.frictionEquations			= [];
		this.quatNormalizeSkip			= options.quatNormalizeSkip !== undefined ? options.quatNormalizeSkip : 0;
		this.quatNormalizeFast			= options.quatNormalizeFast !== undefined ? options.quatNormalizeFast : false;
		this.time						= 0.0;
		this.stepnumber					= 0;
		this.default_dt					= 1/60;
		this.nextId						= 0;
		this.gravity					= options.gravity || new THREE.Vector3(0, -9.81, 0);
		this.broadphase					= options.broadphase !== undefined ? options.broadphase : new NaiveBroadphase();
		this.bodies						= [];
		this.solver						= options.solver !== undefined ? options.solver : new GSSolver();
		this.constraints				= [];
		this.narrowphase				= new Narrowphase(this);
		this.collisionMatrix			= new ArrayCollisionMatrix();
		this.collisionMatrixPrevious	= new ArrayCollisionMatrix();
		this.bodyOverlapKeeper			= new OverlapKeeper();
		this.shapeOverlapKeeper			= new OverlapKeeper();
		this.materials					= [];
		this.contactmaterials			= [];
		this.contactMaterialTable		= new TupleDictionary();
		this.defaultMaterial 			= new Material("default");
		this.defaultContactMaterial 	= new ContactMaterial(this.defaultMaterial, this.defaultMaterial, { friction: 0.3, restitution: 0.0 });
		this.doProfiling				= false;
		this.profile 					= {
			solve					: 0,
			makeContactConstraints	: 0,
			broadphase				: 0,
			integrate				: 0,
			narrowphase				: 0,
		};
		this.accumulator				= 0;
		this.subsystems					= [];
		this.addBodyEvent				= { type : "addBody",	body : null	};
		this.removeBodyEvent			= { type:"removeBody",	body : null	};
		this.idToBodyMap				= {};
		this.broadphase.setWorld(this);
	}
	getContactMaterial(m1, m2) {
		return this.contactMaterialTable.get(m1.id,m2.id); //this.contactmaterials[this.mats2cmat[i+j*this.materials.length]];
	}
	numObjects() {
		return this.bodies.length;
	}
	collisionMatrixTick() {
		var temp = this.collisionMatrixPrevious;
		this.collisionMatrixPrevious = this.collisionMatrix;
		this.collisionMatrix = temp;
		this.collisionMatrix.reset();

		this.bodyOverlapKeeper.tick();
		this.shapeOverlapKeeper.tick();
	}
	add(body) {
		if(this.bodies.indexOf(body) !== -1) return;
		body.index = this.bodies.length;
		this.bodies.push(body);
		body.world = this;
		body.initPosition.copy(body.position);
		body.initVelocity.copy(body.velocity);
		body.timeLastSleepy = this.time;
		if(body instanceof Body){
			body.initAngularVelocity.copy(body.angularVelocity);
			body.initQuaternion.copy(body.quaternion);
		}
		this.collisionMatrix.setNumObjects(this.bodies.length);
		this.addBodyEvent.body = body;
		this.idToBodyMap[body.id] = body;
		this.dispatchEvent(this.addBodyEvent);
	}
	addBody(body) {
		this.add(body);
	}
	addConstraint(c) {
		this.constraints.push(c);
	}
	removeConstraint(c) {
		var idx = this.constraints.indexOf(c);
		if(idx!==-1) this.constraints.splice(idx,1);
	}
	rayTest(from, to, result) {
		if(result instanceof RaycastResult)	this.raycastClosest(from, to, { skipBackfaces: true }, result);
		else this.raycastAll(from, to, {	skipBackfaces: true	}, result);
	}
	raycastAll(from, to, options, callback) {
		options.mode = Ray.ALL;
		options.from = from;
		options.to = to;
		options.callback = callback;
		return tmpRay.intersectWorld(this, options);
	}
	raycastAny(from, to, options, result) {
		options.mode = Ray.ANY;
		options.from = from;
		options.to = to;
		options.result = result;
		return tmpRay.intersectWorld(this, options);
	};
	raycastClosest(from, to, options, result) {
		options.mode = Ray.CLOSEST;
		options.from = from;
		options.to = to;
		options.result = result;
		return tmpRay.intersectWorld(this, options);
	};
	remove(body) {
		body.world = null;
		var n = this.bodies.length - 1,
			bodies = this.bodies,
			idx = bodies.indexOf(body);
		if(idx !== -1){
			bodies.splice(idx, 1); // Todo: should use a garbage free method
			// Recompute index
			for(var i=0; i!==bodies.length; i++) bodies[i].index = i;
			this.collisionMatrix.setNumObjects(n);
			this.removeBodyEvent.body = body;
			delete this.idToBodyMap[body.id];
			this.dispatchEvent(this.removeBodyEvent);
		}
	}
	removeBody(body){
		this.remove(body);
	}
	getBodyById(id) {
		return this.idToBodyMap[id];
	}
	getShapeById(id) {
		var bodies = this.bodies;
		for(var i=0, bl = bodies.length; i<bl; i++){
			var shapes = bodies[i].shapes;
			for (var j = 0, sl = shapes.length; j < sl; j++) {
				var shape = shapes[j];
				if(shape.id === id) return shape;
			}
		}
	}
	addMaterial(m) {
		this.materials.push(m);
	}
	addContactMaterial(cmat) {
		// Add contact material
		this.contactmaterials.push(cmat);
		// Add current contact material to the material table
		this.contactMaterialTable.set(cmat.materials[0].id,cmat.materials[1].id,cmat);
	}
/**
	// performance.now()
	if(typeof performance === 'undefined'){
		performance = {};
	}
	if(!performance.now){
		var nowOffset = Date.now();
		if (performance.timing && performance.timing.navigationStart){
			nowOffset = performance.timing.navigationStart;
		}
		performance.now = function(){
			return Date.now() - nowOffset;
		};
	}
*/
	step(dt, timeSinceLastCalled, maxSubSteps) {
		maxSubSteps = maxSubSteps || 10;
		timeSinceLastCalled = timeSinceLastCalled || 0;
		if(timeSinceLastCalled === 0){ // Fixed, simple stepping
			this.internalStep(dt);
			// Increment time
			this.time += dt;
		} else {
			this.accumulator += timeSinceLastCalled;
			var substeps = 0;
			while (this.accumulator >= dt && substeps < maxSubSteps) {
				// Do fixed steps to catch up
				this.internalStep(dt);
				this.accumulator -= dt;
				substeps++;
			}
			var t = (this.accumulator % dt) / dt;
			for(var j=0; j !== this.bodies.length; j++){
				var b = this.bodies[j];
				b.previousPosition.lerp(b.position, t, b.interpolatedPosition);
				b.previousQuaternion.slerp(b.quaternion, t, b.interpolatedQuaternion);
				b.previousQuaternion.normalize();
			}
			this.time += timeSinceLastCalled;
		}
	}
	internalStep(dt) {
		var	World_step_postStepEvent = {type:"postStep"}, // Reusable event objects to save memory
			World_step_preStepEvent = {type:"preStep"},
			World_step_collideEvent = {type:Body.COLLIDE_EVENT_NAME, body:null, contact:null },
			World_step_oldContacts = [], // Pools for unused objects
			World_step_frictionEquationPool = [],
			World_step_p1 = [], // Reusable arrays for collision pairs
			World_step_p2 = [],
			World_step_gvec = new THREE.Vector3(), // Temporary vectors and quats
			World_step_vi = new THREE.Vector3(),
			World_step_vj = new THREE.Vector3(),
			World_step_wi = new THREE.Vector3(),
			World_step_wj = new THREE.Vector3(),
			World_step_t1 = new THREE.Vector3(),
			World_step_t2 = new THREE.Vector3(),
			World_step_rixn = new THREE.Vector3(),
			World_step_rjxn = new THREE.Vector3(),
			World_step_step_q = new THREE.Quaternion(),
			World_step_step_w = new THREE.Quaternion(),
			World_step_step_wq = new THREE.Quaternion(),
			invI_tau_dt = new THREE.Vector3();		
		
		this.dt = dt;

		var world = this,
			that = this,
			contacts = this.contacts,
			p1 = World_step_p1,
			p2 = World_step_p2,
			N = this.numObjects(),
			bodies = this.bodies,
			solver = this.solver,
			gravity = this.gravity,
			doProfiling = this.doProfiling,
			profile = this.profile,
			DYNAMIC = Body.DYNAMIC,
			profilingStart,
			constraints = this.constraints,
			frictionEquationPool = World_step_frictionEquationPool,
			gx = gravity.x,
			gy = gravity.y,
			gz = gravity.z,
			i = 0;
		if(doProfiling)	profilingStart = performance.now();
		// Add gravity to all objects
		for(i = 0; i < N; i++){
			var bi = bodies[i];
			if(bi.type === DYNAMIC){ // Only for dynamic bodies
				var f = bi.force, m = bi.mass;
				f.x += m*gx;
				f.y += m*gy;
				f.z += m*gz;
			}
		}
		// Update subsystems
		for(var i = 0, Nsubsystems = this.subsystems.length; i < Nsubsystems; i++) this.subsystems[i].update();
		// Collision detection
		if(doProfiling){ profilingStart = performance.now(); }
		p1.length = 0; // Clean up pair arrays from last step
		p2.length = 0;
		this.broadphase.collisionPairs( this, p1, p2 );
		if(doProfiling){ profile.broadphase = performance.now() - profilingStart; }
		// Remove constrained pairs with collideConnected == false
		for(i = 0; i < constraints.length; i++) {
			var c = constraints[i];
			if(!c.collideConnected){
				for(var j = p1.length - 1; j >= 0; j -= 1){
					if( (c.bodyA === p1[j] && c.bodyB === p2[j]) ||
						(c.bodyB === p1[j] && c.bodyA === p2[j])){
						p1.splice(j, 1);
						p2.splice(j, 1);
					}
				}
			}
		}
		this.collisionMatrixTick();
		// Generate contacts
		if(doProfiling){ profilingStart = performance.now(); }
		var oldcontacts = World_step_oldContacts;
		var NoldContacts = contacts.length;

		for(i = 0; i < NoldContacts; i++)	oldcontacts.push(contacts[i]);
		contacts.length = 0;
		// Transfer FrictionEquation from current list to the pool for reuse
		var NoldFrictionEquations = this.frictionEquations.length;
		for(i = 0; i < NoldFrictionEquations; i++) frictionEquationPool.push(this.frictionEquations[i]);
		this.frictionEquations.length = 0;
		this.narrowphase.getContacts(p1, p2, this, contacts, oldcontacts, this.frictionEquations, frictionEquationPool);
		if(doProfiling)	profile.narrowphase = performance.now() - profilingStart;
		// Loop over all collisions
		if(doProfiling)	profilingStart = performance.now();
		// Add all friction eqs
		for(var i = 0; i < this.frictionEquations.length; i++)	solver.addEquation(this.frictionEquations[i]);
		for(var k = 0; k < contacts.length; k++) {
			// Current contact
			var c = contacts[k];
			// Get current collision indeces
			var bi = c.bi, bj = c.bj,
				si = c.si, sj = c.sj;
			// Get collision properties
			var cm;
			if(bi.material && bj.material) cm = this.getContactMaterial( bi.material,bj.material ) || this.defaultContactMaterial;
			else cm = this.defaultContactMaterial;
			// c.enabled = bi.collisionResponse && bj.collisionResponse && si.collisionResponse && sj.collisionResponse;
			var mu = cm.friction;
			// c.restitution = cm.restitution;
			// If friction or restitution were specified in the material, use them
			if(bi.material && bj.material){
				if(bi.material.friction >= 0 && bj.material.friction >= 0) mu = bi.material.friction * bj.material.friction;
				if(bi.material.restitution >= 0 && bj.material.restitution >= 0) c.restitution = bi.material.restitution * bj.material.restitution;
			}

			solver.addEquation(c);

			if( bi.allowSleep &&
				bi.type === Body.DYNAMIC &&
				bi.sleepState  === Body.SLEEPING &&
				bj.sleepState  === Body.AWAKE &&
				bj.type !== Body.STATIC
			){
				var speedSquaredB = bj.velocity.lengthSq() + bj.angularVelocity.lengthSq();
				var speedLimitSquaredB = Math.pow(bj.sleepSpeedLimit,2);
				if(speedSquaredB >= speedLimitSquaredB * 2)	bi._wakeUpAfterNarrowphase = true;
			}

			if( bj.allowSleep &&
				bj.type === Body.DYNAMIC &&
				bj.sleepState  === Body.SLEEPING &&
				bi.sleepState  === Body.AWAKE &&
				bi.type !== Body.STATIC
			){
				var speedSquaredA = bi.velocity.lengthSq() + bi.angularVelocity.lengthSq();
				var speedLimitSquaredA = Math.pow(bi.sleepSpeedLimit,2);
				if(speedSquaredA >= speedLimitSquaredA*2) bj._wakeUpAfterNarrowphase = true;
			}
			// Now we know that i and j are in contact. Set collision matrix state
			this.collisionMatrix.set( bi, bj, true );
			if (!this.collisionMatrixPrevious.get( bi, bj )) {
				// First contact!
				// We reuse the collideEvent object, otherwise we will end up creating new objects for each new contact, even if there's no event listener attached.
				World_step_collideEvent.body = bj;
				World_step_collideEvent.contact = c;
				bi.dispatchEvent(World_step_collideEvent);
				World_step_collideEvent.body = bi;
				bj.dispatchEvent(World_step_collideEvent);
			}
			this.bodyOverlapKeeper.set(bi.id, bj.id);
			this.shapeOverlapKeeper.set(si.id, sj.id);
		}

		this.emitContactEvents();

		if(doProfiling){
			profile.makeContactConstraints = performance.now() - profilingStart;
			profilingStart = performance.now();
		}

		// Wake up bodies
		for(i = 0; i < N; i++){
			var bi = bodies[i];
			if(bi._wakeUpAfterNarrowphase){
				bi.wakeUp();
				bi._wakeUpAfterNarrowphase = false;
			}
		}

		// Add user-added constraints
		for(i = 0; i < constraints.length; i++){
			var c = constraints[i];
			c.update();
			for(var j=0; j < c.equations.length; j++){
				var eq = c.equations[j];
				solver.addEquation(eq);
			}
		}

		// Solve the constrained system
		solver.solve( dt, this );

		if(doProfiling){
			profile.solve = performance.now() - profilingStart;
		}

		// Remove all contacts from solver
		solver.removeAllEquations();

		// Apply damping, see http://code.google.com/p/bullet/issues/detail?id=74 for details
		var pow = Math.pow;
		for(i = 0; i < N; i++) {
			var bi = bodies[i];
			if(bi.type & DYNAMIC){ // Only for dynamic bodies
				var ld = pow(1.0 - bi.linearDamping,dt);
				var v = bi.velocity;
				v.multiplyScalar( ld );
				var av = bi.angularVelocity;
				if(av){
					var ad = pow(1.0 - bi.angularDamping,dt);
					av.multiplyScalar( ad );
				}
			}
		}

		this.dispatchEvent(World_step_preStepEvent);

		// Invoke pre-step callbacks
		for(i = 0; i < N; i++) {
			var bi = bodies[i];
			if(bi.preStep){
				bi.preStep.call(bi);
			}
		}

		// Leap frog
		// vnew = v + h*f/m
		// xnew = x + h*vnew
		if(doProfiling){
			profilingStart = performance.now();
		}
		var stepnumber = this.stepnumber;
		var quatNormalize = stepnumber % (this.quatNormalizeSkip + 1) === 0;
		var quatNormalizeFast = this.quatNormalizeFast;

		for(i = 0; i < N; i++){
			bodies[i].integrate(dt, quatNormalize, quatNormalizeFast);
		}
		this.clearForces();

		this.broadphase.dirty = true;

		if(doProfiling){
			profile.integrate = performance.now() - profilingStart;
		}

		// Update world time
		this.time += dt;
		this.stepnumber += 1;

		this.dispatchEvent(World_step_postStepEvent);

		// Invoke post-step callbacks
		for(i = 0; i < N; i++) {
			var bi = bodies[i];
			var postStep = bi.postStep;
			if(postStep){
				postStep.call(bi);
			}
		}

		// Sleeping update
		if(this.allowSleep){
			for(i = 0; i < N; i++) {
				bodies[i].sleepTick(this.time);
			}
		}
	}
	
	emitContactEvents() {
		var additions = [];
		var removals = [];
		var beginContactEvent = { type: 'beginContact',	bodyA: null, bodyB: null };
		var endContactEvent   = { type: 'endContact',	bodyA: null, bodyB: null };
		var beginShapeContactEvent = { type: 'beginShapeContact', bodyA: null, bodyB: null,	shapeA: null, shapeB: null };
		var endShapeContactEvent   = { type: 'endShapeContact',   bodyA: null, bodyB: null, shapeA: null, shapeB: null };
		return function(){
			var hasBeginContact = this.hasAnyEventListener('beginContact');
			var hasEndContact = this.hasAnyEventListener('endContact');

			if(hasBeginContact || hasEndContact) this.bodyOverlapKeeper.getDiff(additions, removals);
			if(hasBeginContact){
				for (var i = 0, l = additions.length; i < l; i += 2) {
					beginContactEvent.bodyA = this.getBodyById(additions[i]);
					beginContactEvent.bodyB = this.getBodyById(additions[i+1]);
					this.dispatchEvent(beginContactEvent);
				}
				beginContactEvent.bodyA = beginContactEvent.bodyB = null;
			}

			if(hasEndContact){
				for (var i = 0, l = removals.length; i < l; i += 2) {
					endContactEvent.bodyA = this.getBodyById(removals[i]);
					endContactEvent.bodyB = this.getBodyById(removals[i+1]);
					this.dispatchEvent(endContactEvent);
				}
				endContactEvent.bodyA = endContactEvent.bodyB = null;
			}

			additions.length = removals.length = 0;

			var hasBeginShapeContact = this.hasAnyEventListener('beginShapeContact');
			var hasEndShapeContact = this.hasAnyEventListener('endShapeContact');

			if(hasBeginShapeContact || hasEndShapeContact){
				this.shapeOverlapKeeper.getDiff(additions, removals);
			}

			if(hasBeginShapeContact){
				for (var i = 0, l = additions.length; i < l; i += 2) {
					var shapeA = this.getShapeById(additions[i]);
					var shapeB = this.getShapeById(additions[i+1]);
					beginShapeContactEvent.shapeA = shapeA;
					beginShapeContactEvent.shapeB = shapeB;
					beginShapeContactEvent.bodyA = shapeA.body;
					beginShapeContactEvent.bodyB = shapeB.body;
					this.dispatchEvent(beginShapeContactEvent);
				}
				beginShapeContactEvent.bodyA = beginShapeContactEvent.bodyB = beginShapeContactEvent.shapeA = beginShapeContactEvent.shapeB = null;
			}

			if(hasEndShapeContact){
				for (var i = 0, l = removals.length; i < l; i += 2) {
					var shapeA = this.getShapeById(removals[i]);
					var shapeB = this.getShapeById(removals[i+1]);
					endShapeContactEvent.shapeA = shapeA;
					endShapeContactEvent.shapeB = shapeB;
					endShapeContactEvent.bodyA = shapeA.body;
					endShapeContactEvent.bodyB = shapeB.body;
					this.dispatchEvent(endShapeContactEvent);
				}
				endShapeContactEvent.bodyA = endShapeContactEvent.bodyB = endShapeContactEvent.shapeA = endShapeContactEvent.shapeB = null;
			}

		};
	}
	
	clearForces() {
		for(var i = 0; i < this.bodies.length; i++) {
			this.bodies[i].force.set( 0, 0, 0 );
			this.bodies[i].torque.set( 0, 0, 0 );
		}
	}
}
