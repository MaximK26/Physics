import * as THREE	from 'three';
import { PhysicWorld }	from './PhysicWorld';

export class GameWorld {
	constructor(){
		this.graphicWorld = null;
		this.physicsWorld = new PHysicsWorld(this);
		this.objects = [];
	}
	update(timeStep) {
		timeStep = 0.6;
		this.physicsWorld.update(timeStep);
		
	}
	render() {
		this.update();
	}
	addObject(object) {
	
	}
	removeObject(object) {
	
	}
}
