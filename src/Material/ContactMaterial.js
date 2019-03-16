import { Utils }	from '../Utils/Utils';

export class ContactMaterial {
	constructor(m1, m2, options) {
		options = Utils.defaults(options, {
			friction: 0.3,
			restitution: 0.3,
			contactEquationStiffness: 1e7,
			contactEquationRelaxation: 3,
			frictionEquationStiffness: 1e7,
			frictionEquationRelaxation: 3
		});
		this.id = ContactMaterial.idCounter++;
		this.materials = [m1, m2];
		this.friction = options.friction;
		this.restitution = options.restitution;
		this.contactEquationStiffness = options.contactEquationStiffness;
		this.contactEquationRelaxation = options.contactEquationRelaxation;
		this.frictionEquationStiffness = options.frictionEquationStiffness;
		this.frictionEquationRelaxation = options.frictionEquationRelaxation;
	}
}

ContactMaterial.idCounter = 0;
