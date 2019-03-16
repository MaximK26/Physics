export class Shape {
	constructor(options) {
		options = options || {};
		this.id						= Shape.IDCounter++;
		this.type					= options.type || Shape.types.DUMMY;
		this.boundingSphereRadius	= 0;
		this.collisionResponse		= options.collisionResponse || true;
		this.collisionFilterGroup	= options.collisionFilterGroup || 1;
		this.collisionFilterMask	= options.collisionFilterMask || -1;
		this.material				= options.material || null;
		this.body					= null;
	}
	updateBoundingSphereRadius() { throw "computeBoundingSphereRadius() not implemented for shape type " + this.type; }
	volume() { throw "volume() not implemented for shape type "+this.type; }
	calculateLocalInertia(mass, target) { throw "calculateLocalInertia() not implemented for shape type " + this.type; }
}

Shape.IDCounter = 0;
Shape.types = {
	DUMMY			: 0,
    SPHERE			: 1,
    PLANE			: 2,
    BOX				: 4,
    COMPOUND		: 8,
    CONVEXPOLYHEDRON: 16,
    HEIGHTFIELD		: 32,
    PARTICLE		: 64,
    CYLINDER		: 128,
    TRIMESH			: 256
};
