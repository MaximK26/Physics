
import * as THREE					from 'three';

export { Transform }				from './Math/Transform';
export { JacobianElement }			from './Math/JacobianElement';

export { Box }						from './Shapes/Box';
export { ConvexPolyhedron }			from './Shapes/ConvexPolyhedron';
export { Plane }					from './Shapes/Plane';
export { Shape }					from './Shapes/Shape';
export { Cylinder }					from './Shapes/Cylinder';
export { Sphere }					from './Shapes/Sphere';

export { Body }						from './Objects/Body';
export { Spring }					from './Objects/Spring';
export { SPHSystem }				from './Objects/SPHSystem';

export { Octree }					from './Utils/Octree';
export { Pool }						from './Utils/Pool';
export { Utils }					from './Utils/Utils';
export { TupleDictionary }			from './Utils/TupleDictionary';
export { Vec3Pool }					from './Utils/Vec3Pool';
export { EventTarget }				from './Utils/EventTarget';

export { Material }					from './Material/Material';
export { ContactMaterial }			from './Material/ContactMaterial';

export { RotationalEquation }		from './Equations/RotationalEquation';
export { ConeEquation }				from './Equations/ConeEquation';
export { FrictionEquation }			from './Equations/FrictionEquation';
export { Equation }					from './Equations/Equation';
export { RotationalMotorEquation }	from './Equations/RotationalMotorEquation';
export { ContactEquation }			from './Equations/ContactEquation';

export { SplitSolver }				from './Solver/SplitSolver';
export { GSSolver }					from './Solver/GSSolver';
export { Solver }					from './Solver/Solver';

export { RaycastResult }			from './Collision/RaycastResult';
export { OverlapKeeper }			from './Collision/OverlapKeeper';
export { Broadphase }				from './Collision/Broadphase';
export { SAPBroadphase }			from './Collision/SAPBroadphase';
export { GridBroadphase }			from './Collision/GridBroadphase';
export { Ray }						from './Collision/Ray';
export { NaiveBroadphase }			from './Collision/NaiveBroadphase';
export { ArrayCollisionMatrix }		from './Collision/ArrayCollisionMatrix';
export { AABB }						from './Collision/AABB';
export { ObjectCollisionMatrix }	from './Collision/ObjectCollisionMatrix';

export { Constraint }				from './Constraints/Constraint';
export { HingeConstraint }			from './Constraints/HingeConstraint';
export { PointToPointConstraint }	from './Constraints/PointToPointConstraint';
export { ConeTwistConstraint }		from './Constraints/ConeTwistConstraint';
export { LockConstraint }			from './Constraints/LockConstraint';
export { DistanceConstraint }		from './Constraints/DistanceConstraint';

export { Narrowphase }				from './World/Narrowphase';
export { World }					from './World/World';

console.log([
'    ██████╗ ██╗  ██╗██╗   ██╗███████╗██╗ ██████╗███████╗    ',
'    ██╔══██╗██║  ██║╚██╗ ██╔╝██╔════╝██║██╔════╝██╔════╝    ',
'    ██████╔╝███████║ ╚████╔╝ ███████╗██║██║     ███████╗    ',
'    ██╔═══╝ ██╔══██║  ╚██╔╝  ╚════██║██║██║     ╚════██║    ',
'    ██║     ██║  ██║   ██║   ███████║██║╚██████╗███████║    ',
'    ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝ ╚═════╝╚══════╝    ',
'                                                            ',
'                   ███████╗ ██████╗ ██████╗                 ',
'                   ██╔════╝██╔═══██╗██╔══██╗                ',
'                   █████╗  ██║   ██║██████╔╝                ',
'                   ██╔══╝  ██║   ██║██╔══██╗                ',
'                   ██║     ╚██████╔╝██║  ██║                ',
'                   ╚═╝      ╚═════╝ ╚═╝  ╚═╝                ',
'                                                            ',
'████████╗██╗  ██╗██████╗ ███████╗███████╗        ██╗███████╗',
'╚══██╔══╝██║  ██║██╔══██╗██╔════╝██╔════╝        ██║██╔════╝',
'   ██║   ███████║██████╔╝█████╗  █████╗          ██║███████╗',
'   ██║   ██╔══██║██╔══██╗██╔══╝  ██╔══╝     ██   ██║╚════██║',
'   ██║   ██║  ██║██║  ██║███████╗███████╗██╗╚█████╔╝███████║',
'   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚════╝ ╚══════╝'
].join('\n'))                                        

var Vector3		= THREE.Vector3,
	Matrix3		= THREE.Matrix3,
	Quaternion	= THREE.Quaternion;

Vector3.prototype.almostEquals = function(v, precision){
    if(precision === undefined) precision = 1e-6;
    if( Math.abs(this.x-v.x)>precision ||
        Math.abs(this.y-v.y)>precision ||
        Math.abs(this.z-v.z)>precision ) return false;
    return true;
}

Vector3.prototype.almostZero = function(precision){
    if(precision === undefined) precision = 1e-6;
    if( Math.abs(this.x) > precision ||
        Math.abs(this.y) > precision ||
        Math.abs(this.z) > precision ) return false;
    return true;
}

Vector3.prototype.tangents = function( t1, t2 ) {
    var norm = this.length();
    if(norm > 0.0){
        var n = new THREE.Vector3();
        var inorm = 1 / norm;
        n.set(this.x * inorm, this.y * inorm, this.z * inorm);
        var randVec = new THREE.Vector3();
        if(Math.abs( n.x ) < 0.9) {
            randVec.set(1,0,0);
            t1 = new THREE.Vector3().crossVectors( n, randVec );
        } else {
            randVec.set(0,1,0);
            t1 = new THREE.Vector3().crossVectors( n, randVec );
        }
        t2 = new THREE.Vector3().crossVectors( n, t1 );
    } else {
        // The normal length is zero, make something up
        t1.set(1, 0, 0);
        t2.set(0, 1, 0);
    }
};

Matrix3.prototype.setRotationFromQuaternion = function( q ) {
    var x = q.x, y = q.y, z = q.z, w = q.w,
        x2 = x + x, y2 = y + y, z2 = z + z,
        xx = x * x2, xy = x * y2, xz = x * z2,
        yy = y * y2, yz = y * z2, zz = z * z2,
        wx = w * x2, wy = w * y2, wz = w * z2,
        e = this.elements;

    e[3*0 + 0] = 1 - ( yy + zz );
    e[3*0 + 1] = xy - wz;
    e[3*0 + 2] = xz + wy;

    e[3*1 + 0] = xy + wz;
    e[3*1 + 1] = 1 - ( xx + zz );
    e[3*1 + 2] = yz - wx;

    e[3*2 + 0] = xz - wy;
    e[3*2 + 1] = yz + wx;
    e[3*2 + 2] = 1 - ( xx + yy );

    return this;
};

Quaternion.prototype.integrate = function(angularVelocity, dt, angularFactor, target){
    target = target || new Quaternion();

    var ax = angularVelocity.x * angularFactor.x,
        ay = angularVelocity.y * angularFactor.y,
        az = angularVelocity.z * angularFactor.z,
        bx = this.x,
        by = this.y,
        bz = this.z,
        bw = this.w;

    var half_dt = dt * 0.5;

    target.x += half_dt * (ax * bw + ay * bz - az * by);
    target.y += half_dt * (ay * bw + az * bx - ax * bz);
    target.z += half_dt * (az * bw + ax * by - ay * bx);
    target.w += half_dt * (- ax * bx - ay * by - az * bz);

    return target;
}

Quaternion.prototype.normalize = function(){
    var l = Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w);
    if ( l === 0 ) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
    } else {
        l = 1 / l;
        this.x *= l;
        this.y *= l;
        this.z *= l;
        this.w *= l;
    }
    return this;
}

Quaternion.prototype.normalizeFast = function () {
    var f = (3.0-(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w))/2.0;
    if ( f === 0 ) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 0;
    } else {
        this.x *= f;
        this.y *= f;
        this.z *= f;
        this.w *= f;
    }
    return this;
}





































