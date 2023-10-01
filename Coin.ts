import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { CenteredEntity } from './CenteredEntity.js'

export class Coin extends CenteredEntity {
	/* property overrides */

	angleVel = 0.08;

	constructor( pos: Vec2 ) {
		super( pos, 4, 16 );

		this.material = new Material( 0, 1.0, 0.7 );
		this.altMaterial = new Material( 0, 1.0, 0.5 );
	}
}