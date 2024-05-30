import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { CenteredEntity } from './CenteredEntity.js'

export class Coin extends CenteredEntity {

	materials: Array<Material> = [];

	/* property overrides */

	angleVel = 0.08;

	constructor( pos: Vec2 ) {
		super( pos, 8, 8 );

		this.material = new Material( 0, 1.0, 0.7 );

		for ( let i = 0; i < 6; i++ ) {
			this.materials.push( new Material( i * 60, 1.0, 0.7 ) );
			this.materials[i].alpha = 1.0;
			this.materials[i].emit = 1.0;
		}
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeCircle( new Vec2(), this.width, 6 );

		shape.parent = this;
		shape.material = this.material;

		for ( let i = 0; i < shape.edges.length; i++ ) {
			shape.edges[i].material = this.materials[i];
		}

		return [shape];
	}
}