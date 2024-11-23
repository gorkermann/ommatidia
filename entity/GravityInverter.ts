import { Line } from '../lib/juego/Line.js'
import { Material } from '../lib/juego/Material.js'
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'

import { CenteredEntity } from '../CenteredEntity.js'

export class GravityInverter extends CenteredEntity {

	line: Line;

	/* property overrides */

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );

		if ( width > height ) {
			this.line = Line.fromPoints( this.pos.minus( new Vec2( width / 2, 0 ) ),
										 this.pos.plus( new Vec2( width / 2, 0 ) ) );
		} else {
			this.line = Line.fromPoints( this.pos.minus( new Vec2( 0, height / 2 ) ),
										 this.pos.plus( new Vec2( 0, height / 2 ) ) );
		}

		this.material = new Material( 300, 1.0, 0.5 );
		this.material.alpha = 0.5;
		this.material.emit = 1.0;
	}
}