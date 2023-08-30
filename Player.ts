import { Entity } from "./lib/juego/Entity.js"
import { Shape } from "./lib/juego/Shape.js"
import { Vec2 } from "./lib/juego/Vec2.js"

export class Player extends Entity {

	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;

	constructor( posX: number, posY: number ) {
		super( posX, posY, 16, 16 );
	}

	update() {
		this.posX += this.vel.x;
		this.posY += this.vel.y;

		this.vel.x = 0;
	}
}