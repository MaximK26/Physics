import * as THREE	from 'three';
import { Pool }		from './Pool';

export class Vec3Pool extends Pool {
	constructor() {
		super();
		this.type = THREE.Vector3;
	}
	constructObject() {
		return new THREE.Vector3();
	}
}