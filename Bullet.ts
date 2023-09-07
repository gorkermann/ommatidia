import { Entity } from "./lib/juego/Entity.js"
import { Material } from './lib/juego/Material.js'
import { Vec2 } from "./lib/juego/Vec2.js"

export class Bullet extends Entity {
	speed: number;

	constructor( pos: Vec2, vel: Vec2 ) {
		super( pos, 8, 8 );
	
		this.material = new Material( 60, 1.0, 0.5 );

		this.vel = vel;
	}

	setVel() {
		this.vel.normalize();
		this.vel.scale( this.speed );
	}

	onCollideLeft() {
		this.removeThis = true;
	}

	onCollideRight() {
		this.removeThis = true;
	}

	onCollideUp() {
		this.removeThis = true;
	}

	onCollideDown() {
		this.removeThis = true;
	}
}