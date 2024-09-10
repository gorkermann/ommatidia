import { Material } from '../lib/juego/Material.js'
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'

import { CenteredEntity } from '../CenteredEntity.js'

/*
	The height of the inverter is very important in creating a nice-feeling
	element that players don't get trapped in. It depends on the the height of the
	player entity as well as the height of the surrounding blocks. These
	factors dictate the minimum height from which a player can fall into the inverter.

	For a player of height 16 and blocks of height 30, an inverter of height 4 is good.
	A height of 6 or 8 would result in the player not clearing past the far edge when
	falling into the inverter from the minimum height.

	There is probably some math to be done to create a general solution, but this works
	well enough. 
 */

export class GravityInverter extends CenteredEntity {

	/* property overrides */

	constructor( pos: Vec2 ) {
		super( pos, 30, 18 );

		this.material = new Material( 300, 1.0, 0.5 );
		this.material.alpha = 0.5;
		this.material.emit = 1.0;
	}
}