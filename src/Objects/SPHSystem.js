import * as THREE		from 'three';
import { Shape }		from '../Shapes/Shape';
import { Particle }		from '../Shapes/Particle';
import { Body }			from '../Objects/Body';
import { Material }		from '../Material/Material';

export class SPHSystem {
	constructor() {
		this.particles = [];
		this.density = 1;
		this.smoothingRadius = 1;
		this.speedOfSound = 1;
		this.viscosity = 0.01;
		this.eps = 0.000001;
		this.pressures = [];
		this.densities = [];
		this.neighbors = [];
	}
	add(particle) {
		this.particles.push(particle);
		if(this.neighbors.length < this.particles.length){
			this.neighbors.push([]);
		}
	}
	remove(particle){
		var idx = this.particles.indexOf(particle);
		if(idx !== -1){
			this.particles.splice(idx,1);
			if(this.neighbors.length > this.particles.length){
				this.neighbors.pop();
			}
		}
	}
	getNeighbors(particle, neighbors) {
		var N = this.particles.length,
			id = particle.id,
			R2 = this.smoothingRadius * this.smoothingRadius,
			dist = new THREE.Vector3();
		for(var i=0; i!==N; i++){
			var p = this.particles[i];
			p.position.vsub(particle.position,dist);
			if(id!==p.id && dist.norm2() < R2){
				neighbors.push(p);
			}
		}
	}
	update() {
		var SPHSystem_update_dist = new THREE.Vector3(),
			SPHSystem_update_a_pressure = new THREE.Vector3(),
			SPHSystem_update_a_visc = new THREE.Vector3(),
			SPHSystem_update_gradW = new THREE.Vector3(),
			SPHSystem_update_r_vec = new THREE.Vector3(),
			SPHSystem_update_u = new THREE.Vector3(); // Relative velocity		
		var N = this.particles.length,
			dist = SPHSystem_update_dist,
			cs = this.speedOfSound,
			eps = this.eps;

		for(var i=0; i!==N; i++){
			var p = this.particles[i]; // Current particle
			var neighbors = this.neighbors[i];

			// Get neighbors
			neighbors.length = 0;
			this.getNeighbors(p,neighbors);
			neighbors.push(this.particles[i]); // Add current too
			var numNeighbors = neighbors.length;

			// Accumulate density for the particle
			var sum = 0.0;
			for(var j=0; j!==numNeighbors; j++){

				//printf("Current particle has position %f %f %f\n",objects[id].pos.x(),objects[id].pos.y(),objects[id].pos.z());
				p.position.vsub(neighbors[j].position, dist);
				var len = dist.norm();

				var weight = this.w(len);
				sum += neighbors[j].mass * weight;
			}

			// Save
			this.densities[i] = sum;
			this.pressures[i] = cs * cs * (this.densities[i] - this.density);
		}
		// Add forces
		// Sum to these accelerations
		var a_pressure= SPHSystem_update_a_pressure;
		var a_visc =    SPHSystem_update_a_visc;
		var gradW =     SPHSystem_update_gradW;
		var r_vec =     SPHSystem_update_r_vec;
		var u =         SPHSystem_update_u;
		for(var i=0; i!==N; i++){
			var particle = this.particles[i];
			a_pressure.set(0,0,0);
			a_visc.set(0,0,0);
			// Init vars
			var Pij;
			var nabla;
			var Vij;
			// Sum up for all other neighbors
			var neighbors = this.neighbors[i];
			var numNeighbors = neighbors.length;
			//printf("Neighbors: ");
			for(var j=0; j!==numNeighbors; j++){
				var neighbor = neighbors[j];
				//printf("%d ",nj);
				// Get r once for all..
				particle.position.vsub(neighbor.position,r_vec);
				var r = r_vec.norm();
				// Pressure contribution
				Pij = -neighbor.mass * (this.pressures[i] / (this.densities[i]*this.densities[i] + eps) + this.pressures[j] / (this.densities[j]*this.densities[j] + eps));
				this.gradw(r_vec, gradW);
				// Add to pressure acceleration
				gradW.mult(Pij , gradW);
				a_pressure.vadd(gradW, a_pressure);
				// Viscosity contribution
				neighbor.velocity.vsub(particle.velocity, u);
				u.mult( 1.0 / (0.0001+this.densities[i] * this.densities[j]) * this.viscosity * neighbor.mass , u );
				nabla = this.nablaw(r);
				u.mult(nabla,u);
				// Add to viscosity acceleration
				a_visc.vadd( u, a_visc );
			}
			// Calculate force
			a_visc.mult(particle.mass, a_visc);
			a_pressure.mult(particle.mass, a_pressure);
			// Add force to particles
			particle.force.vadd(a_visc, particle.force);
			particle.force.vadd(a_pressure, particle.force);
		}
	}
	// Calculate the weight using the W(r) weightfunction
	w(r) {
		var h = this.smoothingRadius;
		return 315.0/(64.0*Math.PI*Math.pow(h,9)) * Math.pow(h*h-r*r,3);
	}
	// calculate gradient of the weight function
	gradw(rVec, resultVec) {
		var r = rVec.norm(), h = this.smoothingRadius;
		rVec.mult(945.0/(32.0*Math.PI*Math.pow(h,9)) * Math.pow((h*h-r*r),2) , resultVec);
	}
	// Calculate nabla(W)
	nablaw(r) {
		var h = this.smoothingRadius;
		var nabla = 945.0/(32.0*Math.PI*Math.pow(h,9)) * (h*h-r*r)*(7*r*r - 3*h*h);
		return nabla;
	}
}
