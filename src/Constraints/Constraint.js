import { Utils }	from '../Utils/Utils';

export class Constraint {
	constructor(bodyA, bodyB, options) {
		options = Utils.defaults(options,{
			collideConnected : true,
			wakeUpBodies : true,
		});
		this.equations = [];
		this.bodyA = bodyA;
		this.bodyB = bodyB;
		this.id = Constraint.idCounter++;
		this.collideConnected = options.collideConnected;
		if(options.wakeUpBodies){
			if(bodyA) bodyA.wakeUp();
			if(bodyB) bodyB.wakeUp();
		}
	}
	update() { throw new Error("method update() not implmemented in this Constraint subclass!") };
	enable() {
		var eqs = this.equations;
		for(var i=0; i<eqs.length; i++)	eqs[i].enabled = true;
	}
	disable() {
		var eqs = this.equations;
		for(var i=0; i<eqs.length; i++) eqs[i].enabled = false;
	}
}

Constraint.idCounter = 0;
