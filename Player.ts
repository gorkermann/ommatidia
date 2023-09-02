import { Entity } from "./lib/juego/Entity.js"
import { Shape } from "./lib/juego/Shape.js"
import { Vec2 } from "./lib/juego/Vec2.js"

export class Player extends Entity {

	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;

	constructor( pos: Vec2 ) {
		super( pos, 16, 16 );
	}

	update() {
		this.pos.add( this.vel );

		this.vel.x = 0;
	}
}