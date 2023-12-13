import { Newable } from './lib/juego/constructors.js'
import { Dict } from './lib/juego/util.js'

import { Anim, AnimField, PhysField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { Shape } from './lib/juego/Shape.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Bullet } from './Bullet.js'
import { COL } from './collisionGroup.js'
import { CenteredEntity } from './CenteredEntity.js'

let wallUnit = 20;

export class Door extends Entity {
	locked: boolean = false;

	lock() {}
	unlock() {}
}

export class HorizDoor extends Door {
	halves: Array<Entity> = [];

	/* property overrides */
	isGhost: boolean = true;
	collisionGroup = COL.LEVEL;
	collisionMask = COL.PLAYER_BULLET;

	anim = new Anim();

	editFields: Array<string> = this.editFields.concat( ['locked'] );

	material = new Material( 210, 1.0, 0.5 );

	constructor( pos: Vec2=new Vec2( 0, 0 ) ) {
		super( pos, 40, 20 );

		this.material.cornerShaderIndex = 2;

		this.halves[0] = new Entity( new Vec2( -wallUnit * 0.5, 0 ), wallUnit, wallUnit * 0.8 );
		this.halves[1] = new Entity( new Vec2( wallUnit * 0.5, 0 ), wallUnit, wallUnit * 0.8 );

		for ( let half of this.halves ) {
			half.material = this.material;
			this.addSub( half );
		}

		this.anim.fields['left-pos'] = new PhysField( this.halves[0], 'pos', 'vel', 1 );
		this.anim.fields['right-pos'] = new PhysField( this.halves[1], 'pos', 'vel', 1 );
		this.anim.fields['sat'] = new AnimField( this.material, 'sat', 0.1 );
		this.anim.fields['locked'] = new AnimField( this, 'locked' );
	}

	unlock() {
		this.anim.clear();
		this.anim.pushFrame( new AnimFrame( {
			'locked': { value: false }
		} ) );
		this.anim.pushFrame( new AnimFrame( {
			'sat': { value: 1.0 }
		} ) );
	}

	lock() {
		this.anim.clear();
		this.anim.pushFrame( new AnimFrame( {
			'left-pos': { value: new Vec2( -wallUnit * 0.5, 0 ) },
			'right-pos': { value: new Vec2( wallUnit * 0.5, 0 ) },
		} ) );
		this.anim.pushFrame( new AnimFrame( {
			'sat': { value: 0.0 }
		} ) );
		this.anim.pushFrame( new AnimFrame( {
			'locked': { value: true }
		} ) );
	}	

	hitWith( entity: Entity ) {
		if ( entity instanceof Bullet ) {
			entity.removeThis = true;

			if ( !this.locked && this.anim.isDone() ) {
				this.anim.pushFrame( new AnimFrame( {
					'left-pos': { value: new Vec2( -wallUnit * 0.5, 0 ) },
					'right-pos': { value: new Vec2( wallUnit * 0.5, 0 ) },
				} ) );
				this.anim.pushFrame( new AnimFrame( {
					'locked': { value: false, expireOnCount: 5000 },
				} ) );
				this.anim.pushFrame( new AnimFrame( {
					'left-pos': { value: new Vec2( -wallUnit * 1.5, 0 ) },
					'right-pos': { value: new Vec2( wallUnit * 1.5, 0 ) },
				} ) );
			}
		}
	}
}

export let constructors: Dict<Newable> = { 
	'HorizDoor': HorizDoor,
}