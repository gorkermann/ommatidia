import { Entity } from "./lib/juego/Entity.js"
import { Material } from './lib/juego/Material.js'
import { Vec2 } from "./lib/juego/Vec2.js"

export class Explosion extends Entity {
	speed: number = 2;
	maxWidth = 40;
	alpha: number = 1.0;

	constructor( pos: Vec2 ) {
		super( pos, 2, 2 );
	
		this.material = new Material( 60, 1.0, 0.5 );
	}

	update() {
		if ( this.width < this.maxWidth ) {
			this.width += this.speed;
			this.height += this.speed;

		} else {
			this.removeThis = true;
		}

		//this.material.lum *= 1.1;
		this.alpha *= 0.95;
		this.material.hue *= 0.95;
	}

	draw( context: CanvasRenderingContext2D ) {
		context.globalAlpha = this.alpha;

		super.draw( context );

		context.globalAlpha = 1.0;
	}
}