import * as THREE	from 'three';

export class JacobianElement {
	constructor() {
		this.spatial = new THREE.Vector3();
		this.rotational = new THREE.Vector3();
	}
	
	multiplyElement( element ) {
		return element.spatial.dot( this.spatial ) + element.rotational.dot( this.rotational );
	}
	
	multiplyVectors( spatial, rotational ) {
		return spatial.dot( this.spatial ) + rotational.dot( this.rotational );
	}
}
