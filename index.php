<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<body>

<div id="PosY"></div>
<div id="Dot"></div>

	<script src="./build/three.min.js"></script>
	<script src="./build/cannon.min.js"></script>
	<script src="./build/three.physics.min.js"></script>

	
<script>

var geometry = new THREE.SphereBufferGeometry( 5, 16, 16 );
var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
var sphere = new THREE.Mesh( geometry, material );

console.log('geometry', geometry);

var shape = new PHYSICS.ConvexPolyhedron(geometry);
shape.material = { friction : 0.3 };


var body = new PHYSICS.Body({
	mass	: 1,
	position: new THREE.Vector3(0, 100, 0),
	shape	: shape
});
body.material = { friction : 0.3 };


var plane = new PHYSICS.Body({
	mass	: 0,
	position: new THREE.Vector3(),
	shape	: new PHYSICS.Plane()
});

console.log('body', body);

var world = new PHYSICS.World();
world.add(body);
world.add(plane);

console.log('world', world);



var fixedTimeStep = 1.0 / 60.0; // seconds
var maxSubSteps = 3;

// Start the simulation loop

var lastTime;

var c = 0;

(function simloop(time){
  requestAnimationFrame(simloop);
  if(lastTime !== undefined){
     var dt = (time - lastTime) / 1000;
     world.step(fixedTimeStep, dt, maxSubSteps);
  }
  document.getElementById('PosY').innerHTML = `position : x = ${body.position.x} y = ${body.position.y} z = ${body.position.z}`;
  //console.log("Sphere y position: " + body.position.y);
  lastTime = time;
  c++;
  //if(c == 5) requestAnimationFrame(null);
})();

</script>
	
</body>
</html>
