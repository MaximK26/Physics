import * as THREE	from 'three';
import { Body }		from '../Objects/Body';
import { Shape }	from '../Shapes/Shape';
import { Plane }	from '../Shapes/Plane';

export class Broadphase {
	constructor() {
		this.world				= null;
		this.useBoundingBoxes	= false;
		this.dirty				= true;
	}
	
	collisionPairs( world, p1, p2 ) { throw new Error("collisionPairs not implemented for this BroadPhase class!"); }
	
	needBroadphaseCollision( bodyA, bodyB ) {
		// Check collision filter masks
		if((bodyA.collisionFilterGroup & bodyB.collisionFilterMask) === 0 || (bodyB.collisionFilterGroup & bodyA.collisionFilterMask) === 0) return false;
		// Check types
		if(((bodyA.type & Body.STATIC) !== 0 || bodyA.sleepState === Body.SLEEPING) &&
		   ((bodyB.type & Body.STATIC) !== 0 || bodyB.sleepState === Body.SLEEPING)) {
			// Both bodies are static or sleeping. Skip.
			return false;
		}
		return true;
	}
	
	intersectionTest(bodyA, bodyB, pairs1, pairs2) {
		if(this.useBoundingBoxes) this.doBoundingBoxBroadphase(bodyA, bodyB, pairs1, pairs2);
		else this.doBoundingSphereBroadphase(bodyA, bodyB, pairs1, pairs2);
	}
	
	doBoundingSphereBroadphase(bodyA, bodyB, pairs1, pairs2) {
		var r = new THREE.Vector3().subVectors( bodyB.position, bodyA.position );
		var boundingRadiusSum2 = Math.pow(bodyA.boundingRadius + bodyB.boundingRadius, 2);
		var norm2 = r.lengthSq();
		if(norm2 < boundingRadiusSum2){
			pairs1.push(bodyA);
			pairs2.push(bodyB);
		}
	}
	
	doBoundingBoxBroadphase( bodyA, bodyB, pairs1, pairs2 ) {
		if(bodyA.aabbNeedsUpdate) bodyA.computeAABB();
		if(bodyB.aabbNeedsUpdate) bodyB.computeAABB();
		// Check AABB / AABB
		if(bodyA.aabb.overlaps(bodyB.aabb)) {
			pairs1.push(bodyA);
			pairs2.push(bodyB);
		}
	}
	
	makePairsUnique( pairs1, pairs2 ) {
		var t = { keys:[] },
			p1 = [],
			p2 = [];
		for(var i = 0; i < pairs1.length; i++) {
			p1[i] = pairs1[i];
			p2[i] = pairs2[i];
		}
		pairs1.length = pairs2.length = 0;
		for(var i = 0; i < pairs1.length; i++) {
			var id1 = p1[i].id,
				id2 = p2[i].id;
			var key = id1 < id2 ? id1+","+id2 :  id2+","+id1;
			t[key] = i;
			t.keys.push(key);
		}
		for(var i = 0; i < t.keys.length; i++){
			var key = t.keys.pop(),
				pairIndex = t[key];
			pairs1.push(p1[pairIndex]);
			pairs2.push(p2[pairIndex]);
			delete t[key];
		}
	}
	
	setWorld( world ) { };
	
	aabbQuery( world, aabb, result ) {
		console.warn('.aabbQuery is not implemented in this Broadphase subclass.');
		return [];
	}
}

Broadphase.boundingSphereCheck = function( bodyA, bodyB ) {
	var dist = new THREE.Vector3().subVectors( bodyA.position, bodyB.position );
	return Math.pow(bodyA.shape.boundingSphereRadius + bodyB.shape.boundingSphereRadius, 2) > dist.lengthSq();
}
