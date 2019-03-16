export class Material {
	constructor(options) {
		var name = '';
		options = options || {};
		if(typeof(options) === 'string') {
			name = options;
			options = {};
		} else if(typeof(options) === 'object') {
			name = `material_${new Date() * 1}`;
		}
		this.name = name;
		this.id = Material.idCounter++;
		this.friction = typeof(options.friction) !== 'undefined' ? options.friction : -1;
		this.restitution = typeof(options.restitution) !== 'undefined' ? options.restitution : -1;
	}
}

Material.idCounter = 0;