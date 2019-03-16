import * as THREE from 'three';
import { Shape } from './Shape';

export class Plane extends Shape {
	constructor() {
		super({ type: Shape.types.PLANE });
		this.worldNormal = new THREE.Vector3();
		this.worldNormalNeedsUpdate = true;
		this.boundingSphereRadius = Number.MAX_VALUE;
	}
	
	computeWorldNormal( quat ) {
		var n = this.worldNormal;
		n.set( 0, 1, 0 ).applyQuaternion( quat );
		this.worldNormalNeedsUpdate = false;
	}
	
	calculateLocalInertia( mass, target) {
		target = target || new THREE.Vector3();
		return target;
	}
	
	volume() { return Number.MAX_VALUE;	}
	
	calculateWorldAABB( pos, quat, min, max ) {
		var tempNormal = new THREE.Vector3();
		tempNormal.set( 0, 1, 0 ).applyQuaternion( quat );
		var maxVal = Number.MAX_VALUE;
		min.set(-maxVal, -maxVal, -maxVal);
		max.set(maxVal, maxVal, maxVal);
		if(tempNormal.x === 1){ max.x = pos.x; }
		if(tempNormal.y === 1){ max.y = pos.y; }
		if(tempNormal.z === 1){ max.z = pos.z; }
		if(tempNormal.x === -1){ min.x = pos.x; }
		if(tempNormal.y === -1){ min.y = pos.y; }
		if(tempNormal.z === -1){ min.z = pos.z; }
	}
	updateBoundingSphereRadius() {
    	this.boundingSphereRadius = Number.MAX_VALUE;
	}
}
