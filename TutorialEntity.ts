import { Anim, AnimField, PhysField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Bullet } from './Bullet.js'
import { COL } from './collisionGroup.js'
import { CenteredEntity } from './CenteredEntity.js'

export class Orbiter extends CenteredEntity {
	left: CenteredEntity;
	right: CenteredEntity;

	anim = new Anim( {},
	new AnimFrame( {} ) );

	/* property overrides */

	isGhost = true;

	collisionGroup = COL.LEVEL;

	constructor( pos: Vec2=new Vec2(), width: number=0 ) {
		super( pos, width, width );

		this.left = new CenteredEntity( new Vec2( -width, -width ), width, width );
		this.left.material = new Material( 210, 1.0, 0.5 );

		this.anim.fields['left-pos'] = new PhysField( this.left, 'pos', 'vel', 1 );

		this.right = new CenteredEntity( new Vec2( width, width ), width, width );
		this.right.material = new Material( 210, 1.0, 0.5 );

		this.anim.fields['right-pos'] = new PhysField( this.right, 'pos', 'vel', 1 );

		this.addSub( this.left );
		this.addSub( this.right );
	}

	update( step: number, elapsed: number ) {
		this.advance( step );

		if ( this.anim.isDone() ) {
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( -this.width, -this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( this.width, this.width ) }, 
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( -this.width, this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( this.width, -this.width ) }, 
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( this.width, this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( -this.width, -this.width ) }, 
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( this.width, -this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( -this.width, this.width ) }, 
			} ) );
		}

		this.anim.update( step, elapsed );
	}
}

export class Blocker extends CenteredEntity {
	watchTarget: Vec2 = null; // relative to this.pos
	cycleHue: boolean = true;

	/* property overrides */

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	material = new Material( 30, 1.0, 0.5 );

	anim = new Anim( { 
		'pos': new PhysField( this, 'pos', 'vel', 4 ),
		'skewL': new AnimField( this.material, 'skewL', 0 ),
		'cycleHue': new AnimField( this, 'cycleHue' ),
	},
	new AnimFrame( {
		'skewL': { value: 0 },
		'cycleHue': { value: true }
	} ) );

	constructor( pos: Vec2=new Vec2() ) {
		super( pos, 60, 20 );
	}

	watch( target: Vec2 ) {
		this.watchTarget = target.minus( this.pos );
	}

	update( step: number, elapsed: number ) {
		this.advance( step );

		if ( this.anim.isDone() ) {
			this.anim.pushFrame( new AnimFrame( {
				'pos': { value: this.pos.plus( new Vec2( this.watchTarget.x, 0 ) ), expireOnCount: 100 },
			} ) );
		}

		this.anim.update( step, elapsed );
	}

	shade() {
		let now = new Date().getTime();

		if ( this.cycleHue ) {
			this.material.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );
		}
	}

	hitWith( otherEntity: Entity ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			this.anim.clear();
			this.anim.pushFrame( new AnimFrame( {
				'cycleHue': { value: true, expireOnReach: true }
			} ) );

			this.anim.pushFrame( new AnimFrame( {
				'pos': { value: this.pos.copy(), expireOnCount: 1000 },
				'cycleHue': { value: false }
			} ) );

			this.anim.pushFrame( new AnimFrame( {
				'skewL': { value: 0.0, expireOnReach: true, overrideRate: 0.1 },
			} ), { threadIndex: 1, tag: 'exit' } );
			this.anim.pushFrame( new AnimFrame( {
				'skewL': { value: 0.5, expireOnReach: true, overrideRate: 0 },
			} ), { threadIndex: 1 } );
		}
	}
}