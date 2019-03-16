import * as THREE from 'three';

export class Transform {
	constructor( options ) {
		options = options || {};
		this.position	= new THREE.Vector3().copy(options.position)	  || new THREE.Vector3();
		this.quaternion = new THREE.Quaternion().copy(options.quaternion) || new THREE.Quaternion();
	}
	
	pointToLocal( worldPoint, result ) {
    	return Transform.pointToLocalFrame(this.position, this.quaternion, worldPoint, result);
	}
	
	pointToWorld( localPoint, result ) {
		return Transform.pointToWorldFrame(this.position, this.quaternion, localPoint, result);
	}
	
	vectorToWorldFrame( localVector, result ) {
		result = new THREE.Vector3().copy( localVector ).applyQuaternion( this.quaternion );
		return result;
	}
}
	
Transform.pointToLocalFrame = function( position, quaternion, worldPoint, result ) {
	var tmpQuat = new THREE.Quaternion().copy( quaternion ).conjugate();
    var result = new THREE.Vector3().subVectors( worldPoint, position ).applyQuaternion( tmpQuat );
    return result;
}

Transform.pointToWorldFrame = function( position, quaternion, localPoint, result ) {
    result = new THREE.Vector3().copy( localPoint ).applyQuaternion( quaternion );
    result.addVectors( position, result );
    return result;
}

Transform.vectorToWorldFrame = function( quaternion, localVector, result ) {
    result = new THREE.Vector().copy( localVector ).applyQuaternion( quaternion );
    return result;
}

Transform.vectorToLocalFrame = function(position, quaternion, worldVector, result) {
    var result = new THREE.Vector3().copy( worldVector );
    quaternion.w *= -1;
    result.applyQuaternion( quaternion );
    quaternion.w *= -1;
    return result;
}

Transform.setRotationFromQuaternion = function( m, q ) {
    var x = q.x, y = q.y, z = q.z, w = q.w, x2 = x + x, y2 = y + y, z2 = z + z,
        xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2,
        wx = w * x2, wy = w * y2, wz = w * z2;
    var e = m.elements;

    e[3*0 + 0] = 1 - ( yy + zz );
    e[3*0 + 1] = xy - wz;
    e[3*0 + 2] = xz + wy;

    e[3*1 + 0] = xy + wz;
    e[3*1 + 1] = 1 - ( xx + zz );
    e[3*1 + 2] = yz - wx;

    e[3*2 + 0] = xz - wy;
    e[3*2 + 1] = yz + wx;
    e[3*2 + 2] = 1 - ( xx + yy );
    m.elements = e;
    return m;
}

