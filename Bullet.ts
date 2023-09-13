import { Entity } from "./lib/juego/Entity.js"
import { Material } from './lib/juego/Material.js'
import { Vec2 } from "./lib/juego/Vec2.js"

import { CenteredEntity } from './CenteredEntity.js'

export class Bullet extends Entity {
	speed: number;

	constructor( pos: Vec2, vel: Vec2 ) {
		super( pos, 8, 8 );
	
		this.material = new Material( 45, 1.0, 0.5 );

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

export class Gutter extends CenteredEntity {
	constructor( pos: Vec2=new Vec2(), w: number=20, h: number=100 ) {
		super( pos, w, h );

		this.material = new Material( 30, 0.0, 0.6, 1.0 );
	}
}