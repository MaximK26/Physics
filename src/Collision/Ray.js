import * as THREE			from 'three';
import { Transform }		from '../Math/Transform';
import { ConvexPolyhedron }	from '../Shapes/ConvexPolyhedron';
import { Box }				from '../Shapes/Box';
import { RaycastResult }	from '../Collision/RaycastResult';
import { Shape }			from '../Shapes/Shape';
import { AABB }				from '../Collision/AABB';

export class Ray {
	constructor(from, to) {
		this.from 					= from ? from.clone() : new THREE.Vector3();
		this.to						= to   ? to.clone()   : new THREE.Vector3();
		this._direction				= new THREE.Vector3();
		this.precision				= 0.0001;
		this.checkCollisionResponse = true;
		this.skipBackfaces			= false;
		this.collisionFilterMask	= -1;
		this.collisionFilterGroup	= -1;
		this.mode					= Ray.ANY;
		this.result					= new RaycastResult();
		this.hasHit					= false;
		this.callback				= function(result){};
	}
	intersectWorld(world, options) {
		var tmpAABB = new AABB();
		var tmpArray = [];
		this.mode = options.mode || Ray.ANY;
		this.result = options.result || new RaycastResult();
		this.skipBackfaces = !!options.skipBackfaces;
		this.collisionFilterMask = typeof(options.collisionFilterMask) !== 'undefined' ? options.collisionFilterMask : -1;
		this.collisionFilterGroup = typeof(options.collisionFilterGroup) !== 'undefined' ? options.collisionFilterGroup : -1;
		if(options.from){ this.from.copy(options.from);	}
		if(options.to){ this.to.copy(options.to); }
		this.callback = options.callback || function(){};
		this.hasHit = false;
		this.result.reset();
		this._updateDirection();
		this.getAABB(tmpAABB);
		tmpArray.length = 0;
		world.broadphase.aabbQuery(world, tmpAABB, tmpArray);
		this.intersectBodies(tmpArray);
		return this.hasHit;
	}
	intersectBody(body, result) {
		if(result){
			this.result = result;
			this._updateDirection();
		}
		var checkCollisionResponse = this.checkCollisionResponse;

		if(checkCollisionResponse && !body.collisionResponse) return;
		if((this.collisionFilterGroup & body.collisionFilterMask)===0 || (body.collisionFilterGroup & this.collisionFilterMask)===0) return;
		var xi = new THREE.Vecot3();
		var qi = new THREE.Quaternion();
		for (var i = 0, N = body.shapes.length; i < N; i++) {
			var shape = body.shapes[i];
			if(checkCollisionResponse && !shape.collisionResponse) continue;
			body.quaternion.mult(body.shapeOrientations[i], qi);
			body.quaternion.vmult(body.shapeOffsets[i], xi);
			xi.vadd(body.position, xi);
			this.intersectShape(shape, qi, xi, body);
			if(this.result._shouldStop)	break;
		}
	}
	intersectBodies(bodies, result) {
		if(result){
			this.result = result;
			this._updateDirection();
		}
		for ( var i = 0, l = bodies.length; !this.result._shouldStop && i < l; i ++ ) this.intersectBody(bodies[i]);
	}
	_updateDirection() {
		this.to.vsub(this.from, this._direction);
		this._direction.normalize();
	}
	intersectShape(shape, quat, position, body) {
		var from = this.from;
		// Checking boundingSphere
		var distance = distanceFromIntersection(from, this._direction, position);
		if ( distance > shape.boundingSphereRadius ) return;
		var intersectMethod = this[shape.type];
		if(intersectMethod)	intersectMethod.call(this, shape, quat, position, body, shape);
	};
/*
	var vector = new THREE.Vector3();
	var normal = new THREE.Vector3();
	var intersectPoint = new THREE.Vector3();

	var a = new THREE.Vector3();
	var b = new THREE.Vector3();
	var c = new THREE.Vector3();
	var d = new THREE.Vector3();
*/
//	var tmpRaycastResult = new RaycastResult();

	intersectBox(shape, quat, position, body, reportedShape) {
		return this.intersectConvex(shape.convexPolyhedronRepresentation, quat, position, body, reportedShape);
	}
	intersectPlane(shape, quat, position, body, reportedShape) {
		var from = this.from;
		var to = this.to;
		var direction = this._direction;
		// Get plane normal
		var worldNormal = new THREE.Vector3(0, 0, 1);
		quat.vmult(worldNormal, worldNormal);
		var len = new THREE.Vector3();
		from.vsub(position, len);
		var planeToFrom = len.dot(worldNormal);
		to.vsub(position, len);
		var planeToTo = len.dot(worldNormal);
		if(planeToFrom * planeToTo > 0)	return;
		if(from.distanceTo(to) < planeToFrom) return;
		var n_dot_dir = worldNormal.dot(direction);
		if (Math.abs(n_dot_dir) < this.precision) return;

		var planePointToFrom = new THREE.Vector3();
		var dir_scaled_with_t = new THREE.Vector3();
		var hitPointWorld = new THREE.Vector3();

		from.vsub(position, planePointToFrom);
		var t = -worldNormal.dot(planePointToFrom) / n_dot_dir;
		direction.scale(t, dir_scaled_with_t);
		from.vadd(dir_scaled_with_t, hitPointWorld);
		this.reportIntersection(worldNormal, hitPointWorld, reportedShape, body, -1);
	}
	getAABB(result) {
		var to = this.to;
		var from = this.from;
		result.lowerBound.x = Math.min(to.x, from.x);
		result.lowerBound.y = Math.min(to.y, from.y);
		result.lowerBound.z = Math.min(to.z, from.z);
		result.upperBound.x = Math.max(to.x, from.x);
		result.upperBound.y = Math.max(to.y, from.y);
		result.upperBound.z = Math.max(to.z, from.z);
	}
	intersectHeightfield(shape, quat, position, body, reportedShape) {
		var data = shape.data,
			w = shape.elementSize;
		// Convert the ray to local heightfield coordinates
		var localRay = intersectHeightfield_localRay; //new Ray(this.from, this.to);
		localRay.from.copy(this.from);
		localRay.to.copy(this.to);
		Transform.pointToLocalFrame(position, quat, localRay.from, localRay.from);
		Transform.pointToLocalFrame(position, quat, localRay.to, localRay.to);
		localRay._updateDirection();
		// Get the index of the data points to test against
		var index = intersectHeightfield_index;
		var iMinX, iMinY, iMaxX, iMaxY;
		// Set to max
		iMinX = iMinY = 0;
		iMaxX = iMaxY = shape.data.length - 1;
		var aabb = new AABB();
		localRay.getAABB(aabb);
		shape.getIndexOfPosition(aabb.lowerBound.x, aabb.lowerBound.y, index, true);
		iMinX = Math.max(iMinX, index[0]);
		iMinY = Math.max(iMinY, index[1]);
		shape.getIndexOfPosition(aabb.upperBound.x, aabb.upperBound.y, index, true);
		iMaxX = Math.min(iMaxX, index[0] + 1);
		iMaxY = Math.min(iMaxY, index[1] + 1);
		for(var i = iMinX; i < iMaxX; i++){
			for(var j = iMinY; j < iMaxY; j++){
				if(this.result._shouldStop)	return;
				shape.getAabbAtIndex(i, j, aabb);
				if(!aabb.overlapsRay(localRay))	continue;
				// Lower triangle
				shape.getConvexTrianglePillar(i, j, false);
				Transform.pointToWorldFrame(position, quat, shape.pillarOffset, worldPillarOffset);
				this.intersectConvex(shape.pillarConvex, quat, worldPillarOffset, body, reportedShape, intersectConvexOptions);
				if(this.result._shouldStop)	return;
				// Upper triangle
				shape.getConvexTrianglePillar(i, j, true);
				Transform.pointToWorldFrame(position, quat, shape.pillarOffset, worldPillarOffset);
				this.intersectConvex(shape.pillarConvex, quat, worldPillarOffset, body, reportedShape, intersectConvexOptions);
			}
		}
	}
	intersectSphere(shape, quat, position, body, reportedShape) {
		var intersectConvexOptions = { faceList: [0] };
		var worldPillarOffset = new THREE.Vector3();
		var intersectHeightfield_localRay = new Ray();
		var intersectHeightfield_index = [];
		var intersectHeightfield_minMax = [];
		var from = this.from,
			to = this.to,
			r = shape.radius;
		var a = Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2) + Math.pow(to.z - from.z, 2);
		var b = 2 * ((to.x - from.x) * (from.x - position.x) + (to.y - from.y) * (from.y - position.y) + (to.z - from.z) * (from.z - position.z));
		var c = Math.pow(from.x - position.x, 2) + Math.pow(from.y - position.y, 2) + Math.pow(from.z - position.z, 2) - Math.pow(r, 2);
		var delta = Math.pow(b, 2) - 4 * a * c;
		var intersectionPoint = new THREE.Vector3();
		var normal = new THREE.Vector3();
		if(delta < 0) return;
		else if(delta === 0) {
			// single intersection point
			from.lerp(to, delta, intersectionPoint);
			intersectionPoint.vsub(position, normal);
			normal.normalize();
			this.reportIntersection(normal, intersectionPoint, reportedShape, body, -1);
		} else {
			var d1 = (- b - Math.sqrt(delta)) / (2 * a);
			var d2 = (- b + Math.sqrt(delta)) / (2 * a);
			if(d1 >= 0 && d1 <= 1){
				from.lerp(to, d1, intersectionPoint);
				intersectionPoint.vsub(position, normal);
				normal.normalize();
				this.reportIntersection(normal, intersectionPoint, reportedShape, body, -1);
			}
			if(this.result._shouldStop)	return;
			if(d2 >= 0 && d2 <= 1){
				from.lerp(to, d2, intersectionPoint);
				intersectionPoint.vsub(position, normal);
				normal.normalize();
				this.reportIntersection(normal, intersectionPoint, reportedShape, body, -1);
			}
		}
	}
	intersectConvex(shape, quat, position, body, reportedShape, options) {
		var minDistNormal = new THREE.Vector3();
		var normal = new THREE.Vector3();
		var vector = new THREE.Vector3();
		var minDistIntersect = new THREE.Vector3();
		var faceList = (options && options.faceList) || null;

		// Checking faces
		var faces = shape.faces,
			vertices = shape.vertices,
			normals = shape.faceNormals;
		var direction = this._direction;

		var from = this.from;
		var to = this.to;
		var fromToDistance = from.distanceTo(to);

		var minDist = -1;
		var Nfaces = faceList ? faceList.length : faces.length;
		var result = this.result;

		for (var j = 0; !result._shouldStop && j < Nfaces; j++) {
			var fi = faceList ? faceList[j] : j;

			var face = faces[fi];
			var faceNormal = normals[fi];
			var q = quat;
			var x = position;

			// determine if ray intersects the plane of the face
			// note: this works regardless of the direction of the face normal

			// Get plane point in world coordinates...
			vector.copy(vertices[face[0]]);
			q.vmult(vector,vector);
			vector.vadd(x,vector);

			// ...but make it relative to the ray from. We'll fix this later.
			vector.vsub(from,vector);

			// Get plane normal
			q.vmult(faceNormal,normal);

			// If this dot product is negative, we have something interesting
			var dot = direction.dot(normal);

			// Bail out if ray and plane are parallel
			if ( Math.abs( dot ) < this.precision ){
				continue;
			}

			// calc distance to plane
			var scalar = normal.dot(vector) / dot;

			// if negative distance, then plane is behind ray
			if (scalar < 0){
				continue;
			}

			// if (dot < 0) {

			// Intersection point is from + direction * scalar
			direction.mult(scalar,intersectPoint);
			intersectPoint.vadd(from,intersectPoint);

			// a is the point we compare points b and c with.
			a.copy(vertices[face[0]]);
			q.vmult(a,a);
			x.vadd(a,a);

			for(var i = 1; !result._shouldStop && i < face.length - 1; i++){
				// Transform 3 vertices to world coords
				b.copy(vertices[face[i]]);
				c.copy(vertices[face[i+1]]);
				q.vmult(b,b);
				q.vmult(c,c);
				x.vadd(b,b);
				x.vadd(c,c);

				var distance = intersectPoint.distanceTo(from);

				if(!(pointInTriangle(intersectPoint, a, b, c) || pointInTriangle(intersectPoint, b, a, c)) || distance > fromToDistance){
					continue;
				}

				this.reportIntersection(normal, intersectPoint, reportedShape, body, fi);
			}
			// }
		}
	}
	intersectTrimesh(mesh, quat, position, body, reportedShape, options) {
		var normal				= new THREE.Vector3();
		var triangles			= [];
		var treeTransform		= new Transform();
		var minDistNormal		= new THREE.Vector3();
		var vector				= new THREE.Vector3();
		var minDistIntersect	= new THREE.Vector3();
		var localAABB			= new AABB();
		var localDirection		= new THREE.Vector3();
		var localFrom			= new THREE.Vector3();
		var localTo				= new THREE.Vector3();
		var worldIntersectPoint = new THREE.Vector3();
		var worldNormal			= new THREE.Vector3();
		var faceList			= (options && options.faceList) || null;

		// Checking faces
		var indices = mesh.indices,
			vertices = mesh.vertices,
			normals = mesh.faceNormals;

		var from = this.from;
		var to = this.to;
		var direction = this._direction;

		var minDist = -1;
		treeTransform.position.copy(position);
		treeTransform.quaternion.copy(quat);

		// Transform ray to local space!
		Transform.vectorToLocalFrame(position, quat, direction, localDirection);
		Transform.pointToLocalFrame(position, quat, from, localFrom);
		Transform.pointToLocalFrame(position, quat, to, localTo);

		localTo.x *= mesh.scale.x;
		localTo.y *= mesh.scale.y;
		localTo.z *= mesh.scale.z;
		localFrom.x *= mesh.scale.x;
		localFrom.y *= mesh.scale.y;
		localFrom.z *= mesh.scale.z;

		localTo.vsub(localFrom, localDirection);
		localDirection.normalize();

		var fromToDistanceSquared = localFrom.distanceSquared(localTo);

		mesh.tree.rayQuery(this, treeTransform, triangles);

		for (var i = 0, N = triangles.length; !this.result._shouldStop && i !== N; i++) {
			var trianglesIndex = triangles[i];

			mesh.getNormal(trianglesIndex, normal);

			// determine if ray intersects the plane of the face
			// note: this works regardless of the direction of the face normal

			// Get plane point in world coordinates...
			mesh.getVertex(indices[trianglesIndex * 3], a);

			// ...but make it relative to the ray from. We'll fix this later.
			a.vsub(localFrom,vector);

			// If this dot product is negative, we have something interesting
			var dot = localDirection.dot(normal);

			// Bail out if ray and plane are parallel
			// if (Math.abs( dot ) < this.precision){
			//     continue;
			// }

			// calc distance to plane
			var scalar = normal.dot(vector) / dot;

			// if negative distance, then plane is behind ray
			if (scalar < 0){
				continue;
			}

			// Intersection point is from + direction * scalar
			localDirection.scale(scalar,intersectPoint);
			intersectPoint.vadd(localFrom,intersectPoint);

			// Get triangle vertices
			mesh.getVertex(indices[trianglesIndex * 3 + 1], b);
			mesh.getVertex(indices[trianglesIndex * 3 + 2], c);

			var squaredDistance = intersectPoint.distanceSquared(localFrom);

			if(!(pointInTriangle(intersectPoint, b, a, c) || pointInTriangle(intersectPoint, a, b, c)) || squaredDistance > fromToDistanceSquared){
				continue;
			}

			// transform intersectpoint and normal to world
			Transform.vectorToWorldFrame(quat, normal, worldNormal);
			Transform.pointToWorldFrame(position, quat, intersectPoint, worldIntersectPoint);
			this.reportIntersection(worldNormal, worldIntersectPoint, reportedShape, body, trianglesIndex);
		}
		triangles.length = 0;
	};

	reportIntersection(normal, hitPointWorld, shape, body, hitFaceIndex) {
		var from = this.from;
		var to = this.to;
		var distance = from.distanceTo(hitPointWorld);
		var result = this.result;
		if(this.skipBackfaces && normal.dot(this._direction) > 0) return;
		result.hitFaceIndex = typeof(hitFaceIndex) !== 'undefined' ? hitFaceIndex : -1;
		switch(this.mode) {
			case Ray.ALL:
				this.hasHit = true;
				result.set(from, to, normal, hitPointWorld,	shape, body, distance );
				result.hasHit = true;
				this.callback(result);
				break;
			case Ray.CLOSEST:
				// Store if closer than current closest
				if(distance < result.distance || !result.hasHit){
					this.hasHit = true;
					result.hasHit = true;
					result.set(from, to, normal, hitPointWorld,	shape, body, distance );
				}
				break;
			case Ray.ANY:
				// Report and stop.
				this.hasHit = true;
				result.hasHit = true;
				result.set(from, to, normal, hitPointWorld, shape, body, distance);
				result._shouldStop = true;
				break;
		}
	}
}

Ray.prototype[Shape.types.BOX]				= Ray.prototype.intersectBox;
Ray.prototype[Shape.types.PLANE]			= Ray.prototype.intersectPlane;
Ray.prototype[Shape.types.HEIGHTFIELD]		= Ray.prototype.intersectHeightfield;
Ray.prototype[Shape.types.SPHERE]			= Ray.prototype.intersectSphere;
Ray.prototype[Shape.types.CONVEXPOLYHEDRON] = Ray.prototype.intersectConvex;
Ray.prototype[Shape.types.TRIMESH]			= Ray.prototype.intersectTrimesh;

Ray.CLOSEST = 1;
Ray.ANY = 2;
Ray.ALL = 4;

Ray.pointInTriangle = function(p, a, b, c) {
	var v1 = new Vec3(),
	v2 = new Vec3();
	c.vsub(a,v0);
	b.vsub(a,v1);
	p.vsub(a,v2);

	var dot00 = v0.dot( v0 );
	var dot01 = v0.dot( v1 );
	var dot02 = v0.dot( v2 );
	var dot11 = v1.dot( v1 );
	var dot12 = v1.dot( v2 );

	var u,v;

	return  ( (u = dot11 * dot02 - dot01 * dot12) >= 0 ) &&
			( (v = dot00 * dot12 - dot01 * dot02) >= 0 ) &&
			( u + v < ( dot00 * dot11 - dot01 * dot01 ) );
}

function distanceFromIntersection(from, direction, position) {
	var v0 = new Vec3(),
	intersect = new Vec3();
		// v0 is vector from from to position
	position.vsub(from,v0);
	var dot = v0.dot(direction);
		// intersect = direction*dot + from
	direction.mult(dot,intersect);
	intersect.vadd(from,intersect);
	var distance = position.distanceTo(intersect);
	return distance;
}
