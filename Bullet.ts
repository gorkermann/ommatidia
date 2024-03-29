import { Anim, AnimField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from "./lib/juego/Entity.js"
import { Shape } from './lib/juego/Shape.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from "./lib/juego/Vec2.js"

import { CenteredEntity } from './CenteredEntity.js'

export class Bullet extends CenteredEntity {
	speed: number;

	/* property overrides */
	flavorName: string = 'BULLET';

	constructor( pos: Vec2, vel: Vec2 ) {
		super( pos, 8, 8 );
	
		this.material = new Material( 45, 1.0, 0.5 );
		this.material.emit = 0.3;

		//this.material.cornerShaderIndex = 1;

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

export class PlayerBullet extends Bullet {
	constructor( pos: Vec2, vel: Vec2, material: Material=null ) {
		super( pos, vel );
	
		if ( material ) {
			this.material = material;
		}

		this.anim = new Anim( {
			'alpha': new AnimField( this.material, 'alpha', 0.1 )
		},
		new AnimFrame( {
			'alpha': { value: 0.3 }
		} ) );

		this.material.alpha = 0.0;
	}
}

export class Gutter extends CenteredEntity {
	/* property overrides */
	flavorName: string = 'GUTTER';

	constructor( pos: Vec2=new Vec2(), w: number=20, h: number=100 ) {
		super( pos, w, h );

		this.material = new Material( 30, 1.0, 0.6, 1 );
		this.material.emit = 0.8;
	}
}