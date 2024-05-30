import { Newable } from './lib/juego/constructors.js'
import { Dict } from './lib/juego/util.js'

import { Anim, AnimField, PhysField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { Shape } from './lib/juego/Shape.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { SolverResult } from './lib/juego/collisionSolver.js'

import { Bullet } from './Bullet.js'
import { COL } from './collisionGroup.js'
import { CenteredEntity } from './CenteredEntity.js'

let wallUnit = 20;

export class Platform extends CenteredEntity {

	velIntent: Vec2 = new Vec2();
	limitLow: Vec2 = new Vec2();
	limitHigh: Vec2 = new Vec2();

	isPliant: boolean = true;

	collideUp: boolean = false;
	collideDown: boolean = false;
	collideRight: boolean = false;
	collideLeft: boolean = false;

	/* property overrides */

	collisionGroup = COL.LEVEL;

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );

		this.limitLow.set( this.pos );
		this.limitHigh.set( this.pos );
	}

	update() {
		if ( this.pos.x <= this.limitLow.x && this.velIntent.x < 0 ) {
			this.velIntent.x *= -1;
		}
		if ( this.pos.x >= this.limitHigh.x && this.velIntent.x > 0 ) {
			this.velIntent.x *= -1;
		}
		if ( this.limitLow.x == this.limitHigh.x ) {
			this.velIntent.x = 0;
		}

		if ( this.pos.y <= this.limitLow.y && this.velIntent.y < 0 ) {
			this.velIntent.y *= -1;
		}
		if ( this.pos.y >= this.limitHigh.y && this.velIntent.y > 0 ) {
			this.velIntent.y *= -1;
		}
		if ( this.limitLow.y == this.limitHigh.y ) {
			this.velIntent.y = 0;
		}

		this.vel.set( this.velIntent );
	}
}
