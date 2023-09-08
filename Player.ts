import { Entity } from "./lib/juego/Entity.js"
import { Contact } from "./lib/juego/Contact.js"
import { Shape } from "./lib/juego/Shape.js"
import { Vec2 } from "./lib/juego/Vec2.js"

import { Bullet, Gutter } from './Bullet.js'

export class Player extends Entity {

	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;
	blockedDirs: Array<Vec2> = [];

	constructor( pos: Vec2 ) {
		super( pos, 16, 16 );
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			console.log( 'ow!' );
			otherEntity.removeThis = true;

		} else if ( otherEntity instanceof Gutter ) {
			console.log( 'ow!' );
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		super.draw( context );

		context.strokeStyle = 'red';
		context.lineWidth = 2;

		for ( let blockedDir of this.blockedDirs ) {
			let a = this.pos.plus( blockedDir.times( 10 ) );

			context.beginPath();
			context.moveTo( this.pos.x, this.pos.y );
			context.lineTo( a.x, a.y );
			context.stroke(); 
		}
	}
}