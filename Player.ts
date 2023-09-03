import { Entity } from "./lib/juego/Entity.js"
import { Shape } from "./lib/juego/Shape.js"
import { Vec2 } from "./lib/juego/Vec2.js"

export class Player extends Entity {

	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;
	blockedDir: Vec2 = null;

	constructor( pos: Vec2 ) {
		super( pos, 16, 16 );
	}

	update() {
		let blockedVel = new Vec2( 0, 0 );

		if ( this.blockedDir ) {
			let dot = this.vel.dot( this.blockedDir );

			if ( dot < 0 ) {
				blockedVel.set( this.blockedDir.times( dot ) );
			}		
		}

		this.pos.add( this.vel.minus( blockedVel ) );
	}

	draw( context: CanvasRenderingContext2D ) {
		super.draw( context );

		context.strokeStyle = 'red';
		context.lineWidth = 2;

		if ( this.blockedDir ) {
			let a = this.pos.plus( this.blockedDir.times( 10 ) );

			context.beginPath();
			context.moveTo( this.pos.x, this.pos.y );
			context.lineTo( a.x, a.y );
			context.stroke(); 
		}
	}
}