import * as THREE	from 'three';
import { JacobianElement }	from '../Math/JacobianElement';

export class Equation {
	constructor( bi, bj, minForce, maxForce ) {
		this.id					= Equation.id++;
		this.minForce			= typeof(minForce) === "undefined" ? -1e6 : minForce;
		this.maxForce			= typeof(maxForce) === "undefined" ? 1e6 : maxForce;
		this.bi 				= bi;
		this.bj					= bj;
		this.a					= 0.0;
		this.b					= 0.0;
		this.eps				= 0.0;
		this.jacobianElementA	= new JacobianElement();
		this.jacobianElementB	= new JacobianElement();
		this.enabled			= true;
		this.multiplier			= 0;
		this.setSpookParams( 1e7, 4, 1/60 );
	}
	
	setSpookParams( stiffness, relaxation, timeStep ) {
		var d = relaxation,
			k = stiffness,
			h = timeStep;
		this.a = 4.0 / (h * (1 + 4 * d));
		this.b = (4.0 * d) / (1 + 4 * d);
		this.eps = 4.0 / (h * h * k * (1 + 4 * d));
	}
	
	computeB( a, b, h ) {
		var GW = this.computeGW(),
			Gq = this.computeGq(),
			GiMf = this.computeGiMf();
		return - Gq * a - GW * b - GiMf*h;
	}
	
	computeGq() {
		var GA = this.jacobianElementA,
			GB = this.jacobianElementB,
			bi = this.bi,
			bj = this.bj,
			xi = bi.position,
			xj = bj.position;
		return GA.spatial.dot(xi) + GB.spatial.dot(xj);
	}
	
	computeGW() {
		var GA = this.jacobianElementA,
			GB = this.jacobianElementB,
			bi = this.bi,
			bj = this.bj,
			vi = bi.velocity,
			vj = bj.velocity,
			wi = bi.angularVelocity,
			wj = bj.angularVelocity;
		return GA.multiplyVectors( vi, wi ) + GB.multiplyVectors( vj, wj );
	}
	
	computeGWlambda() {
		var GA = this.jacobianElementA,
			GB = this.jacobianElementB,
			bi = this.bi,
			bj = this.bj,
			vi = bi.vlambda,
			vj = bj.vlambda,
			wi = bi.wlambda,
			wj = bj.wlambda;
		return GA.multiplyVectors( vi, wi ) + GB.multiplyVectors( vj, wj );
	}
	
	computeGiMf() {
		var iMfi = new THREE.Vector3(),
			iMfj = new THREE.Vector3(),
			invIi_vmult_taui = new THREE.Vector3(),
			invIj_vmult_tauj = new THREE.Vector3();
		var GA = this.jacobianElementA,
			GB = this.jacobianElementB,
			bi = this.bi, bj = this.bj,
			fi = bi.force, ti = bi.torque,
			fj = bj.force, tj = bj.torque,
			invMassi = bi.invMassSolve,
			invMassj = bj.invMassSolve;
		iMfi.copy( fi ).multiplyScalar( invMassi );
		iMfj.copy( fj ).multiplyScalar( invMassj );
		invIi_vmult_taui.copy( ti ).applyMatrix3( bi.invInertiaWorldSolve );
		invIj_vmult_tauj.copy( tj ).applyMatrix3( bj.invInertiaWorldSolve );
		return GA.multiplyVectors( iMfi, invIi_vmult_taui ) + GB.multiplyVectors( iMfj,invIj_vmult_tauj );
	}
	
	computeGiMGt() {
		var tmp = new THREE.Vector3();
		var GA = this.jacobianElementA,
			GB = this.jacobianElementB,
			bi = this.bi,
			bj = this.bj,
			invMassi = bi.invMassSolve,
			invMassj = bj.invMassSolve,
			invIi = bi.invInertiaWorldSolve,
			invIj = bj.invInertiaWorldSolve,
			result = invMassi + invMassj;
		tmp.copy( GA.rotational ).applyMatrix3( invIi );
		result += tmp.dot(GA.rotational);
		tmp.copy( GB.rotational ).applyMatrix3( invIj );
		result += tmp.dot(GB.rotational);
		return  result;
	}
	
	addToWlambda(deltalambda) {
		var GA = this.jacobianElementA,
			GB = this.jacobianElementB,
			bi = this.bi,
			bj = this.bj,
			temp = new THREE.Vector3();
		// Add to linear velocity
		// v_lambda += inv(M) * delta_lamba * G
		temp.copy( GA.spatial ).multiplyScalar( bi.invMassSolve * deltalambda );
		bi.vlambda.addVectors( temp, bi.vlambda );
		temp.copy( GB.spatial ).multiplyScalar( bj.invMassSolve * deltalambda );
		bj.vlambda.addVectors( temp, bj.vlambda );
		// Add to angular velocity
		temp.copy( GA.rotational ).applyMatrix3( bi.invInertiaWorldSolve ).multiplyScalar( deltalambda );
		bi.wlambda.addVectors( bi.wlambda, temp );
		temp.copy( GB.rotational ).applyMatrix3( bj.invInertiaWorldSolve ).multiplyScalar( deltalambda );
		bj.wlambda.addVectors( bj.wlambda, temp );
	}
	
	computeC() { return this.computeGiMGt() + this.eps;	}
}

Equation.id = 0;	
