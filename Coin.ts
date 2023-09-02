import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

export class Coin extends Entity {
	constructor( pos: Vec2 ) {
		super( pos, 16, 16 );

		this.material = new Material( 0, 1.0, 0.5 );
	}
}