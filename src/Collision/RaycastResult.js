import * as THREE			from 'three';

export class RaycastResult{
	constructor() {
		this.rayFromWorld	= new THREE.Vector3();
		this.rayToWorld		= new THREE.Vector3();
		this.hitNormalWorld = new THREE.Vector3();
		this.hitPointWorld	= new THREE.Vector3();
		this.hasHit			= false;
		this.shape			= null;
		this.body			= null;
		this.hitFaceIndex	= -1;
		this.distance		= -1;
		this._shouldStop	= false;
	}
	reset() {
		this.rayFromWorld.setZero();
		this.rayToWorld.setZero();
		this.hitNormalWorld.setZero();
		this.hitPointWorld.setZero();
		this.hasHit = false;
		this.shape = null;
		this.body = null;
		this.hitFaceIndex = -1;
		this.distance = -1;
		this._shouldStop = false;
	}
	abort() { this._shouldStop = true; };
	set(rayFromWorld, rayToWorld, hitNormalWorld, hitPointWorld, shape,	body, distance) {
		this.rayFromWorld.copy(rayFromWorld);
		this.rayToWorld.copy(rayToWorld);
		this.hitNormalWorld.copy(hitNormalWorld);
		this.hitPointWorld.copy(hitPointWorld);
		this.shape = shape;
		this.body = body;
		this.distance = distance;
	}
}