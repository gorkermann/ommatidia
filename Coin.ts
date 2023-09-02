import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

export class Coin extends Entity {
	constructor( posX: number, posY: number ) {
		super( posX, posY, 16, 16 );

		this.material = new Material( 0, 1.0, 0.5 );
	}
}