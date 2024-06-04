import { Vec2 } from './lib/juego/Vec2.js'

import { COL } from './collisionGroup.js'
import { CenteredEntity } from './CenteredEntity.js'

export class Particle extends CenteredEntity {
	life: number = 1.0;
	rate: number;

	/* property overrides */
	collisionGroup: number = COL.ETHEREAL;

	constructor( pos: Vec2, width: number, height: number, alpha: number=1.0, rate: number=0.1 ) {
		super( pos, width, height );

		this.alpha = alpha;
		this.rate = rate;
	}

	update() {
		//this.alpha -= this.rate;
		this.life -= this.rate;

		if ( this.life <= 0 ) this.removeThis = true;
	}
}