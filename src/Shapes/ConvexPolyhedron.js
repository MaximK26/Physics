import * as THREE    from 'three';
import { Transform } from './../Math/Transform';
import { Shape }     from './Shape';

export class ConvexPolyhedron extends Shape {
	constructor(BufferGeometry) {
		super({ type: Shape.types.CONVEXPOLYHEDRON });
		
		this.geometry = BufferGeometry || false;
		if(!this.geometry) throw 'Нет входных данных!';
		if(!BufferGeometry.isBufferGeometry) throw 'Не верные входные данные!\n new PHYSICS.ConvexPolyhedron(THREE.BufferGeometry)';

		this.worldVertices = [];
		this.worldVerticesNeedsUpdate = true;

		this.faceNormals = [];
		this.computeNormals();
		return;
		this.worldFaceNormalsNeedsUpdate = true;
		this.worldFaceNormals = [];

		this.uniqueEdges = [];

		this.computeEdges();
		this.updateBoundingSphereRadius();
	}
	
	get verticesLength() { return this.geometry.attributes.position.count; }
	
	get facesLength() { return this.geometry.index.count / 3; }
	
	getVertex( index ) {
		let i = index * 3;
		return new THREE.Vector3(
			this.geometry.attributes.position.array[i + 0],
			this.geometry.attributes.position.array[i + 1],
			this.geometry.attributes.position.array[i + 2]
		);
	}
	
	setVertex( index, value ) {
		let i = index * 3;
		this.geometry.attributes.position.array[i + 0] = value.x;
		this.geometry.attributes.position.array[i + 1] = value.y;
		this.geometry.attributes.position.array[i + 2] = value.z;
		
	}
	
	getFace( index ) {
		let i = index * 3;
		return [
			this.geometry.index.array[i + 0],
			this.geometry.index.array[i + 1],
			this.geometry.index.array[i + 2],
		];
	}
	
	computeEdges(){
		var edges = this.uniqueEdges;
		edges.length = 0;

		for(var i = 0; i < this.facesLength; i++) {
		    var face = this.getFace(i);
		    var numVertices = face.length;
		    for(var j = 0; j < numVertices; j++) {
		        var k = ( j + 1 ) % numVertices;
		        edge = new THREE.Vector3().subVectors( getVertex(face[j]), getVertex(face[k]) ).normalize();
		        var found = false;
		        for(var p = 0; p !== edges.length; p++){
		            if(edges[p].almostEquals(edge) || edges[p].almostEquals(edge)) {
		                found = true;
		                break;
		            }
		        }
		        if(!found) edges.push(edge.clone());
		    }
		}
	}
	computeNormals(){
		this.faceNormals.length = this.facesLength;
		for(var i = 0; i < this.facesLength; i++) {
		    var n = this.faceNormals[i] || new THREE.Vector3();
		    n = this.getFaceNormal(i);
		    n.negate();
		    this.faceNormals[i] = n;
		    var vertex = this.getVertex(this.getFace(i)[0]);
		    if(n.dot(vertex) < 0) {
		        console.error(".faceNormals[${i}] = Vec3("+n.toString()+") looks like it points into the shape? The vertices follow." + 
		        			  "Make sure they are ordered CCW around the normal, using the right hand rule.");
		        for(var j = 0; j < this.getFace(i).length; j++)
		            console.warn(".vertices["+this.getFace(i)[j]+"] = Vec3("+this.getVertex(this.getFace(i)[j]).toString()+")");
		    }
		}
	}
	computeNormal( a, b, c ) {
		var cb = new THREE.Vector3().subVectors( c, b );
		var ab = new THREE.Vector3().subVectors( b, a );
		var r = new THREE.Vector3().crossVectors(cb, ab);
		return !r.equals(new THREE.Vector3()) ? r.normalize() : new THREE.Vector3(0, 1, 0);
	}
	
	getFaceNormal( index ) {
		var f = this.getFace(index);
		var a = this.getVertex(f[0]);
		var b = this.getVertex(f[1]);
		var c = this.getVertex(f[2]);
		return this.computeNormal(a, b, c);
	}
	
	clipAgainstHull( posA, quatA, hullB, posB, quatB, separatingNormal, minDist, maxDist, result ) {
		var WorldNormal = new THREE.Vector3();
		var hullA = this;
		var curMaxDist = maxDist;
		var closestFaceB = -1;
		var dmax = -Number.MAX_VALUE;
		for(var face = 0; face < hullB.facesLength; face++) {
		    WorldNormal.copy( hullB.faceNormals[face] );
		    WorldNormal.applyQuaternion( quatB );
		    var d = WorldNormal.dot( separatingNormal );
		    if(d > dmax){
		        dmax = d;
		        closestFaceB = face;
		    }
		}
		var worldVertsB1 = [];
		var polyB = hullB.getFace( closestFaceB );
		var numVertices = polyB.length;
		for(var e0 = 0; e0 < numVertices; e0++) {
		    var b = hullB.getVertex( polyB[e0] );
		    var worldb = new THREE.Vector3().copy( b ).applyQuaternion( quatB );
		    worldb.addVectors( posB, worldb );
		    worldVertsB1.push(worldb);
		}
		if( closestFaceB >= 0 ) this.clipFaceAgainstHull( separatingNormal, posA, quatA, worldVertsB1, minDist, maxDist, result );
	}
	
	findSeparatingAxis( hullB, posA, quatA, posB, quatB, target, faceListA, faceListB ) {
		var faceANormalWS3	= new THREE.Vector3(),
		    Worldnormal1	= new THREE.Vector3(),
		    deltaC			= new THREE.Vector3(),
		    worldEdge0		= new THREE.Vector3(),
		    worldEdge1		= new THREE.Vector3(),
		    Cross			= new THREE.Vector3(),
			dmin			= Number.MAX_VALUE,
			hullA			= this;
			curPlaneTests	= 0;

		if(!hullA.uniqueAxes) {
		    var numFacesA = faceListA ? faceListA.length : hullA.facesLength;
		    // Test face normals from hullA
		    for(var i = 0; i < numFacesA; i++){
		        var fi = faceListA ? faceListA[i] : i;
		        // Get world face normal
		        faceANormalWS3.copy( hullA.faceNormals[fi] ).applyQuaternion( quatA );
		        var d = hullA.testSepAxis( faceANormalWS3, hullB, posA, quatA, posB, quatB );
		        if(d === false) return false;
		        if(d < dmin){
		            dmin = d;
		            target.copy( faceANormalWS3 );
		        }
		    }
		} else {
		    // Test unique axes
		    for(var i = 0; i < hullA.uniqueAxes.length; i++) {
		        // Get world axis
		        faceANormalWS3.copy( hullA.uniqueAxes[i] ).applyQuaternion( quatA );
		        var d = hullA.testSepAxis( faceANormalWS3, hullB, posA, quatA, posB, quatB );
		        if(d === false) return false;
		        if(d < dmin){
		            dmin = d;
		            target.copy( faceANormalWS3 );
		        }
		    }
		}
		if(!hullB.uniqueAxes) {
		    // Test face normals from hullB
		    var numFacesB = faceListB ? faceListB.length : hullB.facesLength;
		    for(var i = 0; i < numFacesB; i++) {
		        var fi = faceListB ? faceListB[i] : i;
		        Worldnormal1.copy( hullB.faceNormals[fi] ).applyQuaternion( quatB );
		        curPlaneTests++;
		        var d = hullA.testSepAxis( Worldnormal1, hullB, posA, quatA, posB, quatB );
		        if(d === false) return false;
		        if(d < dmin) {
		            dmin = d;
		            target.copy( Worldnormal1 );
		        }
		    }
		} else {
		    // Test unique axes in B
		    for(var i = 0; i < hullB.uniqueAxes.length; i++) {
		        Worldnormal1.copy( hullB.uniqueAxes[i] ).applyQuaternion( quatB );
		        curPlaneTests++;
		        var d = hullA.testSepAxis( Worldnormal1, hullB, posA, quatA, posB, quatB );
		        if(d === false) return false;
		        if(d < dmin){
		            dmin = d;
		            target.copy( Worldnormal1 );
		        }
		    }
		}
		// Test edges
		for(var e0 = 0; e0 < hullA.uniqueEdges.length; e0++) {
		    // Get world edge
			worldEdge0.copy( hullA.uniqueEdges[e0] ).applyQuaternion( quatA );
		    for(var e1 = 0; e1 < hullB.uniqueEdges.length; e1++) {
		        // Get world edge 2
				worldEdge1.copy( hullB.uniqueEdges[e1] ).applyQuaternion( quatB );
		        Cross.crossVectors(worldEdge0, worldEdge1);
		        if( !Cross.almostZero() ) {
		            Cross.normalize();
		            var dist = hullA.testSepAxis( Cross, hullB, posA, quatA, posB, quatB );
		            if(dist === false) return false;
		            if(dist < dmin){
		                dmin = dist;
		                target.copy( Cross );
		            }
		        }
		    }
		}
		deltaC.subVectors(posB, posA);
		if( (deltaC.dot(target)) > 0 ) target.negate();
		return true;
	}
	
	testSepAxis( axis, hullB, posA, quatA, posB, quatB ) {
		var maxminA	= [],
			maxminB	= [],
			hullA	= this;
		ConvexPolyhedron.project( hullA, axis, posA, quatA, maxminA );
		ConvexPolyhedron.project( hullB, axis, posB, quatB, maxminB );
		var maxA = maxminA[0], minA = maxminA[1],
			maxB = maxminB[0], minB = maxminB[1];
		if(maxA < minB || maxB < minA) return false;
		var d0 = maxA - minB;
		var d1 = maxB - minA;
		var depth = d0 < d1 ? d0 : d1;
		return depth;
	}
	
	calculateLocalInertia( mass, target ) {
		var cli_aabbmin = new THREE.Vector3(),
			cli_aabbmax = new THREE.Vector3();
		this.computeLocalAABB(cli_aabbmin, cli_aabbmax);
		var x = cli_aabbmax.x - cli_aabbmin.x,
		    y = cli_aabbmax.y - cli_aabbmin.y,
		    z = cli_aabbmax.z - cli_aabbmin.z;
		target.x = 1.0 / 12.0 * mass * ( 2*y*2*y + 2*z*2*z );
		target.y = 1.0 / 12.0 * mass * ( 2*x*2*x + 2*z*2*z );
		target.z = 1.0 / 12.0 * mass * ( 2*y*2*y + 2*x*2*x );
	}
	
	getPlaneConstantOfFace( face_i ) {
		var f = this.getFace( face_i );
		var n = this.faceNormals[face_i];
		var v = this.getVertex( f[0] );
		return -n.dot( v );
	}
	
	clipFaceAgainstHull( separatingNormal, posA, quatA, worldVertsB1, minDist, maxDist, result ) {
		var faceANormalWS 		= new THREE.Vector3(),
		    edge0				= new THREE.Vector3(),
		    WorldEdge0			= new THREE.Vector3(),
		    worldPlaneAnormal1	= new THREE.Vector3(),
		    planeNormalWS1		= new THREE.Vector3(),
		    worldA1				= new THREE.Vector3(),
		    localPlaneNormal	= new THREE.Vector3(),
		    planeNormalWS		= new THREE.Vector3(),
			hullA				= this,
			worldVertsB2		= [],
			pVtxIn				= worldVertsB1,
			pVtxOut				= worldVertsB2,
		// Find the face with normal closest to the separating axis
			closestFaceA		= -1,
			dmin				= Number.MAX_VALUE;
		for(var face = 0; face < hullA.facesLength; face++) {
		    faceANormalWS.copy( hullA.faceNormals[face] ).applyQuaternion( quatA );
		    //posA.vadd(faceANormalWS,faceANormalWS);
		    var d = faceANormalWS.dot( separatingNormal );
		    if (d < dmin){
		        dmin = d;
		        closestFaceA = face;
		    }
		}
		if(closestFaceA < 0) return;
		//console.log("closest A: ",closestFaceA);
		// Get the face and construct connected faces
		var polyA = hullA.faces[closestFaceA];
		polyA.connectedFaces = [];
		for(var i = 0; i < hullA.facesLength; i++) {
		    for(var j = 0; j < hullA.getFace(i).length; j++){
		        if(polyA.indexOf(hullA.getFace(i)[j]) !== -1 && i !== closestFaceA && polyA.connectedFaces.indexOf(i) === -1) {
		            polyA.connectedFaces.push(i);
		        }
		    }
		}
		// Clip the polygon to the back of the planes of all faces of hull A, that are adjacent to the witness face
		var numContacts = pVtxIn.length;
		var numVerticesA = polyA.length;
		var res = [];
		for(var e0 = 0; e0 < numVerticesA; e0++) {
		    var a = hullA.getVertex( polyA[e0] );
		    var b = hullA.getVertex(polyA[(e0 + 1) % numVerticesA]);
		    edge0.subVectors( a, b );
		    WorldEdge0.copy( edge0 ).applyRotationPosition( quatA, posA );
		    worldPlaneAnormal1.copy(this.faceNormals[closestFaceA]).applyRotationPosition( quatA, posA );
		    //transA.getBasis()* btVector3(polyA.m_plane[0],polyA.m_plane[1],polyA.m_plane[2]);
		    planeNormalWS1.crossVectors( WorldEdge0, worldPlaneAnormal1 ).negate();
		    worldA1.copy( a ).applyRotationPosition( quatA, posA );
		    var planeEqWS1 = -worldA1.dot( planeNormalWS1 );
		    var planeEqWS;
		    if(true) {
		        var otherFace = polyA.connectedFaces[e0];
		        localPlaneNormal.copy( this.faceNormals[otherFace] );
		        var localPlaneEq = this.getPlaneConstantOfFace( otherFace );

		        planeNormalWS.copy(localPlaneNormal).applyQuaternion( quatA );
		        //posA.vadd(planeNormalWS,planeNormalWS);
		        var planeEqWS = localPlaneEq - planeNormalWS.dot( posA );
		    } else {
		        planeNormalWS.copy( planeNormalWS1 );
		        planeEqWS = planeEqWS1;
		    }
		    // Clip face against our constructed plane
		    this.clipFaceAgainstPlane( pVtxIn, pVtxOut, planeNormalWS, planeEqWS );
		    // Throw away all clipped points, but save the reamining until next clip
		    while(pVtxIn.length)  { pVtxIn.shift(); }
		    while(pVtxOut.length) { pVtxIn.push(pVtxOut.shift()); }
		}
		//console.log("Resulting points after clip:",pVtxIn);
		// only keep contact points that are behind the witness face
		localPlaneNormal.copy( this.faceNormals[closestFaceA] );
		var localPlaneEq = this.getPlaneConstantOfFace( closestFaceA );
		planeNormalWS.copy( localPlaneNormal ).applyQuaternion( quatA );
		var planeEqWS = localPlaneEq - planeNormalWS.dot( posA );
		for (var i = 0; i < pVtxIn.length; i++) {
		    var depth = planeNormalWS.dot( pVtxIn[i] ) + planeEqWS; //???
		    /*console.log("depth calc from normal=",planeNormalWS.toString()," and constant "+planeEqWS+" and vertex ",pVtxIn[i].toString()," gives "+depth);*/
		    if (depth <= minDist) {
		        console.log(`clamped: depth = ${depth} to minDist = ${minDist}`);
		        depth = minDist;
		    }
		    if (depth <= maxDist) {
		        var point = pVtxIn[i];
		        if(depth <= 0) {
		            /*console.log("Got contact point ",point.toString(),
		              ", depth=",depth,
		              "contact normal=",separatingNormal.toString(),
		              "plane",planeNormalWS.toString(),
		              "planeConstant",planeEqWS);*/
		            var p = {
		                point	: point,
		                normal	: planeNormalWS,
		                depth	: depth,
		            };
		            result.push(p);
		        }
		    }
		}
	}
	
	clipFaceAgainstPlane( inVertices, outVertices, planeNormal, planeConstant ) {
		var n_dot_first, n_dot_last;
		var numVerts = inVertices.length;

		if(numVerts < 2) return outVertices;

		var firstVertex = inVertices[inVertices.length - 1],
		    lastVertex  = inVertices[0];

		n_dot_first = planeNormal.dot(firstVertex) + planeConstant;

		for(var vi = 0; vi < numVerts; vi++) {
		    lastVertex = inVertices[vi];
		    n_dot_last = planeNormal.dot( lastVertex ) + planeConstant;
		    if(n_dot_first < 0) {
		        if(n_dot_last < 0) {
		            // Start < 0, end < 0, so output lastVertex
		            var newv = new THREE.Vector3().copy( lastVertex );
		            outVertices.push(newv);
		        } else {
		            // Start < 0, end >= 0, so output intersection
		            var newv = new THREE.Vector3();
		            firstVertex.lerp(lastVertex, newv, n_dot_first / (n_dot_first - n_dot_last));
		            outVertices.push(newv);
		        }
		    } else {
		        if(n_dot_last < 0){
		            // Start >= 0, end < 0 so output intersection and end
		            var newv = new THREE.Vector3();
		            firstVertex.lerp(lastVertex, newv, n_dot_first / (n_dot_first - n_dot_last));
		            outVertices.push(newv);
		            outVertices.push(lastVertex);
		        }
		    }
		    firstVertex = lastVertex;
		    n_dot_first = n_dot_last;
		}
		return outVertices;
	}
	
	computeWorldVertices( position, quat ) {
		var N = this.verticesLength;
		while(this.worldVertices.length < N) {
		    this.worldVertices.push( new THREE.Vector3() );
		}
		var worldVerts = this.worldVertices;
		for(var i = 0; i < N; i++) {
		    worldVerts[i].copy(this.getVertex(i)).applyRotationPosition( quat, position );
		}
		this.worldVerticesNeedsUpdate = false;
	}
	
	computeLocalAABB( aabbmin, aabbmax ) {
		aabbmin.set(  Number.MAX_VALUE,  Number.MAX_VALUE,  Number.MAX_VALUE );
		aabbmax.set( -Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE );

		for(var i = 0; i < this.verticesLength; i++) {
		    var v = this.getVertex(i);
		    if(v.x < aabbmin.x) { aabbmin.x = v.x; } else if(v.x > aabbmax.x) { aabbmax.x = v.x; }
		    if(v.y < aabbmin.y) { aabbmin.y = v.y; } else if(v.y > aabbmax.y) { aabbmax.y = v.y; }
		    if(v.z < aabbmin.z) { aabbmin.z = v.z; } else if(v.z > aabbmax.z) { aabbmax.z = v.z; }
		}
	}
	
	computeWorldFaceNormals( quat ) {
		var N = this.faceNormals.length;
		while(this.worldFaceNormals.length < N){
		    this.worldFaceNormals.push( new THREE.Vector3() );
		}
		var normals = this.faceNormals,
		    worldNormals = this.worldFaceNormals;
		for(var i = 0; i !== N; i++) worldNormals[i].copy( normal[i] ).applyQuaternion( quat );
		this.worldFaceNormalsNeedsUpdate = false;
	}
	
	updateBoundingSphereRadius() {
		// Assume points are distributed with local (0,0,0) as center
		var max2 = 0;
		var verts = this.vertices;
		for(var i = 0, N = this.verticesLength; i < N; i++) {
		    var norm2 = this.getVertex(i).lengthSq();//dot(this.getVertex(i));
		    if(norm2 > max2) max2 = norm2;
		}
		this.boundingSphereRadius = Math.sqrt(max2);
	}
	
	calculateWorldAABB( pos, quat, min, max ) {
		var tempWorldVertex = new THREE.Vector3();
		var n = this.verticesLength;
		var minx, miny, minz, maxx, maxy, maxz;
		for(var i = 0; i < n; i++) {
		    tempWorldVertex.copy( this.getVertex(i) ).applyQuaternion( quat );
		    tempWorldVertex.addVectors( pos, tempWorldVertex );
		    var v = tempWorldVertex;
		    if(v.x < minx || minx === undefined) { minx = v.x; } else if(v.x > maxx || maxx === undefined) { maxx = v.x; }
		    if(v.y < miny || miny === undefined) { miny = v.y; } else if(v.y > maxy || maxy === undefined) { maxy = v.y; }
		    if(v.z < minz || minz === undefined) { minz = v.z; } else if(v.z > maxz || maxz === undefined) { maxz = v.z; }
		}
		min.set(minx, miny, minz);
		max.set(maxx, maxy, maxz);
	}
	
	volume() { return 4.0 * Math.PI * this.boundingSphereRadius / 3.0; }
	
	getAveragePointLocal( target ) {
		target = target || new THREE.Vector3();
		var n = this.verticesLength;
		for(var i = 0; i < n; i++) target.addVectors( this.getVertex(i), target ).divideScalar( n );
		return target;
	}
	// Изменение всех вершин геометрии
	transformAllPoints( offset, quat ) {
		var n = this.verticesLength,
		    verts = this.vertices;
		// Apply rotation
		if(quat) {
		    // Rotate vertices
		    for(var i = 0; i < n; i++) {
		        var v = this.getVertex(i).applyQuaternion( quat );
  				this.setVertex( i, v );
		    }
		    // Rotate face normals
		    for(var i = 0; i < this.faceNormals.length; i++) {
		        this.faceNormals[i].applyQuaternion( quat );
		    }
		    /*
		    // Rotate edges
		    for(var i=0; i<this.uniqueEdges.length; i++){
		        var v = this.uniqueEdges[i];
		        quat.vmult(v,v);
		    }*/
		}
		// Apply offset
		if(offset) {
		    for(var i = 0; i < n; i++){
		    	var v = this.getVertex(i).addVectors( offset, v );
				this.setVertex( i, v );
		    }
		}
	}
	
	pointIsInside( p ) {
		var n		= this.verticesLength,
		    verts	= this.vertices,
		    faces	= this.faces,
		    normals = this.faceNormals;
		var positiveResult = null;
		var N = this.facesLength;
		var pointInside = new THREE.Vector3();
		this.getAveragePointLocal( pointInside );
		for(var i = 0; i < N; i++) {
		    var numVertices = this.getFace( i ).length;
		    var n = normals[i];
		    var v = this.getVertex( this.getFace( i )[0] ); // We only need one point in the face
		    // This dot product determines which side of the edge the point is
		    var vToP = new THREE.Vector3().subVectors( p, v );
		    var r1 = n.dot(vToP);
		    var vToPointInside = new THREE.Vector3().subVectors(pointInside, v);
		    var r2 = n.dot(vToPointInside);
		    if((r1 < 0 && r2 > 0) || (r1 > 0 && r2 < 0)) return false;
		}
		// If we got here, all dot products were of the same sign.
		return positiveResult ? 1 : -1;
	}

}

ConvexPolyhedron.project = function( hull, axis, pos, quat, result ) {
		var n			= hull.verticesLength,
		    worldVertex = new THREE.Vector3(),
		    localAxis	= new THREE.Vector3(),
		    max			= 0,
		    min			= 0,
		    localOrigin = new THREE.Vector3(),
		    vs			= hull.vertices;
		// Transform the axis to local
		Transform.vectorToLocalFrame( pos, quat, axis, localAxis );
		Transform.pointToLocalFrame( pos, quat, localOrigin, localOrigin );
		var add = localOrigin.dot( localAxis );
		min = max = vs[0].dot( localAxis );
		for(var i = 1; i < n; i++) {
		    var val = vs[i].dot( localAxis );
		    if(val > max) max = val;
		    if(val < min) min = val;
		}
		min -= add;
		max -= add;
		if(min > max) {
		    // Inconsistent - swap
		    var temp = min;
		    min = max;
		    max = temp;
		}
		// Output
		result[0] = max;
		result[1] = min;
}
