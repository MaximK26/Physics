import * as THREE	from 'three';
import { AABB }		from '../Collision/AABB';

export class OctreeNode {
	constructor(options) {
		options = options || {};
		this.root = options.root || null;
		this.aabb = options.aabb ? options.aabb.clone() : new AABB();
		this.data = [];
		this.children = [];
	}
}

export class Octree extends OctreeNode {
	constructor(aabb, options) {
		options = options || {};
		options.root = null;
		options.aabb = aabb;
		OctreeNode.call(this, options);
		this.maxDepth = typeof(options.maxDepth) !== 'undefined' ? options.maxDepth : 8;
	}
	reset(aabb, options) { this.children.length = this.data.length = 0 }
	insert(aabb, elementData, level) {
		var nodeData = this.data;
		level = level || 0;
		// Ignore objects that do not belong in this node
		if (!this.aabb.contains(aabb)) return false;
		var children = this.children;
		if(level < (this.maxDepth || this.root.maxDepth)){
			// Subdivide if there are no children yet
			var subdivided = false;
			if (!children.length){
				this.subdivide();
				subdivided = true;
			}
			// add to whichever node will accept it
			for (var i = 0; i !== 8; i++) {
				if (children[i].insert(aabb, elementData, level + 1)) return true;
			}
			if(subdivided) children.length = 0;
		}
		nodeData.push(elementData);
		return true;
	}
	subdivide() {
		var halfDiagonal = new THREE.Vector3();
		var aabb = this.aabb;
		var l = aabb.lowerBound;
		var u = aabb.upperBound;
		var children = this.children;
		children.push(
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(0,0,0) }) }),
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(1,0,0) }) }),
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(1,1,0) }) }),
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(1,1,1) }) }),
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(0,1,1) }) }),
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(0,0,1) }) }),
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(1,0,1) }) }),
			new OctreeNode({ aabb: new AABB({ lowerBound: new THREE.Vector3(0,1,0) }) })
		);
		u.vsub(l, halfDiagonal);
		halfDiagonal.scale(0.5, halfDiagonal);
		var root = this.root || this;
		for (var i = 0; i !== 8; i++) {
			var child = children[i];
			// Set current node as root
			child.root = root;
			// Compute bounds
			var lowerBound = child.aabb.lowerBound;
			lowerBound.x *= halfDiagonal.x;
			lowerBound.y *= halfDiagonal.y;
			lowerBound.z *= halfDiagonal.z;
			lowerBound.vadd(l, lowerBound);
			// Upper bound is always lower bound + halfDiagonal
			lowerBound.vadd(halfDiagonal, child.aabb.upperBound);
		}
	}
	aabbQuery(aabb, result) {
		var nodeData = this.data;
		var children = this.children;
		var queue = [this];
		while (queue.length) {
			var node = queue.pop();
			if (node.aabb.overlaps(aabb)){
				Array.prototype.push.apply(result, node.data);
			}
			Array.prototype.push.apply(queue, node.children);
		}
		return result;
	}
	rayQuery(ray, treeTransform, result) {
		var tmpAABB = new AABB();
		ray.getAABB(tmpAABB);
		tmpAABB.toLocalFrame(treeTransform, tmpAABB);
		this.aabbQuery(tmpAABB, result);
		return result;
	}
	removeEmptyNodes() {
		var queue = [this];
		while (queue.length) {
			var node = queue.pop();
			for (var i = node.children.length - 1; i >= 0; i--) {
				if(!node.children[i].data.length){
					node.children.splice(i, 1);
				}
			}
			Array.prototype.push.apply(queue, node.children);
		}
	}
}
