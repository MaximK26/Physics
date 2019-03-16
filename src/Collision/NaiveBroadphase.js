import { Broadphase }	from './Broadphase';
import { AABB }			from './AABB';

export class NaiveBroadphase extends Broadphase {
	constructor() {	super(); }
	collisionPairs( world, pairs1, pairs2 ) {
		var bodies = world.bodies,
			n = bodies.length,
			bi, bj;
		// Naive N^2 ftw!
		for(var i = 0; i < n; i++) {
			for(var j = 0; j < i; j++) {
				bi = bodies[i];
				bj = bodies[j];
				if(!this.needBroadphaseCollision( bi, bj )) continue;
				this.intersectionTest( bi, bj, pairs1, pairs2 );
			}
		}
	}
	aabbQuery(world, aabb, result) {
		result = result || [];
		for(var i = 0; i < world.bodies.length; i++){
			var b = world.bodies[i];
			if(b.aabbNeedsUpdate) b.computeAABB();
			// Ugly hack until Body gets aabb
			if(b.aabb.overlaps(aabb)) result.push(b);
		}
		return result;
	}
}
