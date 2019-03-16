import * as THREE 			from 'three';
import { Shape }			from './Shape';
import { ConvexPolyhedron }	from './ConvexPolyhedron';


export class Cylinder extends ConvexPolyhedron {
	constructor( radiusTop, radiusBottom, height, numSegments ) {
		    radiusTop    = radiusTop    == undefined || radiusTop    < 0.000001 ? 1 : radiusTop;
		    radiusBottom = radiusBottom == undefined || radiusBottom < 0.000001 ? 1 : radiusBottom;
		    height		 = height 		== undefined || height 		 < 0.000001 ? 1 : height;
		    numSegments	 = numSegments 	== undefined || numSegments  < 0.000001 ? 3 : numSegments;
			console.log(radiusTop, radiusBottom, height, numSegments);
		var N = numSegments,
		    verts = [],
		    axes = [],
		    faces = [],
		    bottomface = [],
		    topface = [],
		    cos = Math.cos,
		    sin = Math.sin;
		// First bottom point
		verts.push(new THREE.Vector3(radiusBottom * cos(0), radiusBottom * sin(0), -height * 0.5));
		bottomface.push(0);
		// First top point
		verts.push(new THREE.Vector3(radiusTop * cos(0), radiusTop * sin(0), height * 0.5));
		topface.push(1);
		for(var i = 0; i < N; i++){
		    var theta = 2 * Math.PI / N * (i + 1);
		    var thetaN = 2 * Math.PI / N * (i + 0.5);
		    if(i < N - 1) {
		        // Bottom
		        verts.push(new THREE.Vector3(radiusBottom * cos(theta), radiusBottom * sin(theta), -height * 0.5));
		        bottomface.push(2 * i + 2);
		        // Top
		        verts.push(new THREE.Vector3(radiusTop * cos(theta), radiusTop * sin(theta), height * 0.5));
		        topface.push(2 * i + 3);
		        // Face
		        faces.push([2 * i + 2, 2 * i + 3, 2 * i + 1, 2 * i]);
		    } else {
		        faces.push([0,1, 2*i+1, 2*i]); // Connect
		    }
		    // Axis: we can cut off half of them if we have even number of segments
		    if(N % 2 === 1 || i < N / 2){
		        axes.push(new THREE.Vector3(cos(thetaN), sin(thetaN), 0));
		    }
		}
		faces.push(topface);
		axes.push(new THREE.Vector3(0,0,1));
		// Reorder bottom face
		var temp = [];
		for(var i = 0; i < bottomface.length; i++){
		    temp.push(bottomface[bottomface.length - i - 1]);
		}
		faces.push(temp);
		console.log(verts, faces, axes);
		super(verts, faces, axes);
		this.type = Shape.types.CYLINDER;
	}
}
