import { Anim, AnimField, PhysField, AnimFrame, AnimTarget } from '../lib/juego/Anim.js'
import { Angle, Angle_PosTurn } from '../lib/juego/Angle.js'
import { Newable } from '../lib/juego/constructors.js'
import { Entity, cullList, TransformOrder } from '../lib/juego/Entity.js'
import { OvalEntity } from '../lib/juego/BasicEntity.js'
import { Range } from '../lib/juego/Editable.js'
import { Contact } from '../lib/juego/Contact.js'
import { Material } from '../lib/juego/Material.js'
import { FuncCall } from '../lib/juego/serialization.js'  
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { Dict } from '../lib/juego/util.js'

import { CenteredEntity } from '../CenteredEntity.js'
import { COL, MILLIS_PER_FRAME } from '../collisionGroup.js'
import { Explosion } from '../Explosion.js'
import { Bullet, Gutter } from '../Bullet.js'

import * as Debug from '../Debug.js'

import { Attack, AttackReq } from './Attack.js'
import { Boss, BossState, BossFlags } from './Boss.js'

let fieldWidth = 600;
let interiorWidth = 200;
let wallUnit = 20;

let attacks = [
	new Attack(
		'shoot_small',
		[]
	),
]

function getAttack( name: string ): Attack {
	for ( let attack of attacks ) {
		if ( attack.name == name ) {
			return attack
		}
	}

	throw new Error( 'getAttack: No attack named ' + name );

	return null;
}

let attackNames = attacks.map( x => x.name );
Debug.fields['CARRIER_ATK'].default = attackNames.join( ',' );
Debug.validators['CARRIER_ATK'] = Debug.arrayOfStrings( attackNames );

function getSegmentedRect( pos: Vec2, width: number, height: number, segLength: number ): Shape {
	let points = [];

	for ( let x = 0; x < width; x += segLength ) {
		points.push( new Vec2( x, 0 ) );
	}

	for ( let y = 0; y < height; y += segLength ) {
		points.push( new Vec2( width, y ) );
	}

	for ( let x = width; x > 0; x -= segLength ) {
		points.push( new Vec2( x, height ) );
	}

	for ( let y = height; y > 0; y -= segLength ) {
		points.push( new Vec2( 0, y ) );
	}

	let shape = Shape.fromPoints( points );
	shape.points.map( x => x.add( new Vec2( -width / 2, -height / 2 ) ) ); // offset so center is at 0,0
	shape.points.map( x => x.add( pos ) );

	return shape;
}

export class CarrierBossBarrier extends CenteredEntity {
	altMaterial = new Material( 210, 1.0, 0.9 );

	// overrides
	material = new Material( 210, 1.0, 0.7 );
	drawWireframe = true;

	constructor( pos: Vec2, diameter: number ) {
		super( pos, diameter, diameter );
	}

	/* Entity overrides */

	getShapes(): Array<Shape> {
		let shape = getSegmentedRect( this.pos, this.width, this.width, 100 );

		shape.material = this.material;
		shape.parent = this;
		shape.hollow = true;

		for ( let i = 0; i < shape.edges.length; i++ ) {
			if ( this.altMaterial && i % 2 == 0 ) {
				shape.edges[i].material = this.altMaterial;
			}
		
			shape.normals[i].flip();
		}

		return [shape];
	}

	draw( context: CanvasRenderingContext2D ) {
		for ( let shape of this.getShapes() ) {
			shape.stroke( context );
		}
	}
}

class Drone extends CenteredEntity {
	speed: number = 5;

	stunned: boolean = false;

	/* property overrides */

	collisionMask = COL.LEVEL | COL.PLAYER_BULLET;

	material = new Material( 240, 1.0, 0.5 );

	alpha: number = 1.0;
	flash: number = 0.0;

	savedVel = new Vec2();

	anim = new Anim( {
		//'pos': new PhysField( this, 'pos', 'vel', this.speed ), // high speed to maintain seek position
		'alpha': new AnimField( this, 'alpha', 0.1 ),
		'flash': new AnimField( this, 'flash', 0.1 )

		// thread 1
		//'angle': new PhysField( this, 'angle', 'angleVel', 0.2 ), // not pointing, so doesn't need isAngle
	} );

	constructor( pos: Vec2, vel: Vec2 ) {
		super( pos, wallUnit * 2, wallUnit * 2 );

		this.vel = vel;
	}

	stun() {
		this.savedVel = this.vel.copy();
		this.vel.setValues( 0, 0 );

		this.stunned = true;
	}

	revive() {
		this.vel = this.savedVel.unit().times( this.speed );

		this.stunned = false;
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( !this.stunned ) {
				this.vel.scale( 0.8 );

				if ( this.vel.length() < 1 ) {
					this.stun();
				
					this.anim.pushFrame( new AnimFrame( {}, [
						new FuncCall<typeof this.revive>( this, 'revive', [] )
					] ) );

					this.anim.pushFrame( new AnimFrame( {
						'alpha': { value: 1.0, expireOnCount: 10000 }
					} ) );
				}

				this.anim.pushFrame( new AnimFrame( {
					'flash': { value: 0.0 }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'flash': { value: 0.5, overrideRate: 0 }
				} ) );
			}

		} else {
			let flippedVel = this.vel.times( -1 );
			let cosine = contact.normal.times( flippedVel.dot( contact.normal ) );
			this.vel = cosine.times( 2 ).minus( flippedVel );
		}
	}

	shade() {
		this.material.skewL = this.flash;
	}
}

export class CarrierBoss extends Boss {
	flash: number = 0.0;

	flags: BossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false
	};

	wait: number = 0;

	shell: CenteredEntity;
	left: CenteredEntity;
	right: CenteredEntity;

	drones: Array<Drone> = [];
	gutters: Array<Gutter> = [];

	/* property overrides */

	attacks = attacks;
	overrideAttackField = 'CARRIER_ATK';

	flavorName = 'CARRIER CORE';

	maxHealth = 40;
	health = this.maxHealth;

	material = new Material( 240, 1.0, 0.5 );

	collisionGroup = COL.LEVEL;
	collisionMask = COL.PLAYER_BULLET;

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', 2 ),
		'alpha': new AnimField( this, 'alpha', 0.05 ),
		'wait': new AnimField( this, 'wait' ),
		'flash': new AnimField( this, 'flash' ),
		'invuln': new AnimField( this, 'invuln' ),
		'state': new AnimField( this, 'state' ),
	},
	new AnimFrame( {
		'flash': { value: 0.0 },
		'invuln': { value: false },
	} ) );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		this.flags['health'] = this.getHealth();

		this.shell = new CenteredEntity( new Vec2( 0, 0 ), this.width + 10, this.width + 10 );
		this.shell.material = new Material( 240, 1.0, 0.8 );
		this.shell.collisionGroup = COL.LEVEL;
		this.addSub( this.shell );

		this.left = new CenteredEntity( new Vec2( this.width / 2 + wallUnit / 2, 0 ), wallUnit, wallUnit );
		this.left.material = this.material;
		this.left.collisionGroup = COL.LEVEL;
		this.addSub( this.left );

		this.right = new CenteredEntity( new Vec2( this.width / 2 + wallUnit / 2, 0 ), wallUnit, wallUnit );
		this.right.material = this.material;
		this.right.collisionGroup = COL.LEVEL;
		this.addSub( this.right );

		this.spawnDrone( 0, Vec2.fromPolar( -0.5 + Math.random(), 5 ) );
		this.spawnDrone( Math.PI, Vec2.fromPolar( Math.PI + -0.5 + Math.random(), 5 ) );

		if ( spawn ) {
			let barrier = new CarrierBossBarrier( this.pos.copy(), fieldWidth );
			this.spawnEntity( barrier );
			barrier.collisionGroup = COL.LEVEL;
		}
	}

	spawnDrone( angle: number, vel: Vec2 ) {
		let v = Vec2.fromPolar( angle, 1 );
		let drone = new Drone( this.pos.plus( v.times( 100 ) ), vel );

		this.spawnEntity( drone );
		drone.collisionGroup = COL.ENEMY_BULLET;
		drone.collisionMask = COL.LEVEL | COL.PLAYER_BULLET;

		this.drones.push( drone );

		let gutter = new Gutter( new Vec2( 0, 0 ), wallUnit, wallUnit / 2 );
		gutter.alpha = 0.5;
		this.spawnEntity( gutter );
		gutter.collisionGroup = COL.ENEMY_BULLET;
		this.gutters.push( gutter );
	}

	/* Entity overrides */

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( contact.sub != this ) return;
			if ( this.invuln ) return;

			this.damage( 1 );
		}
	}

	/* Boss overrides */

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}
 
	canEnter( attack: Attack ): boolean {
		if ( attack.name == 'shoot_small' ) return true;

		return false;
	}

	defaultLogic() {
		/* flag checks */

		this.updateHealthFlags();

		/* attack change */

		if ( this.anim.isDone( [0] ) ) {
			this.chooseAttack();

			let start = Math.PI / 2;
			//this.anim.clear( { withoutTag: 'exit' } );

			// shoot_small
			if ( this.attack.name == 'shoot_small' ) {
				this.anim.pushFrame( new AnimFrame( {
					'wait': { value: 0, expireOnCount: 10000 }
				} ) );
			}
		}

		/* update attack */

		for ( let i = 0; i < this.drones.length; i++ ) {
			this.gutters[i].width = ( this.drones[i].pos.minus( this.pos ) ).length();
			this.gutters[i].pos = ( this.drones[i].pos.plus( this.pos ) ).times( 0.5 );
			this.gutters[i].angle = ( this.drones[i].pos.minus( this.pos ) ).angle();

			if ( this.drones[i].stunned ) this.gutters[i].isGhost = true;
			else this.gutters[i].isGhost = false;
		}

		let okDrones = this.drones.filter( x => !x.stunned )

		if ( okDrones.length >= 2 ) {
			this.left.angle = ( this.drones[0].pos.minus( this.pos ) ).angle();
			this.right.angle = ( this.drones[1].pos.minus( this.pos ) ).angle();

			this.anim.clear( { withTag: 'move' } );

			this.anim.pushFrame( new AnimFrame( {
				'pos': { value: ( this.drones[0].pos.plus( this.drones[1].pos ) ).times( 0.5 ) }
			} ), { tag: 'move' } );

			this.shell.isGhost = false;

		} else if ( okDrones.length == 0 ) {
			this.shell.isGhost = true;
		}

	}
}

export let constructors: Dict<Newable> = { 
	'CarrierBossBarrier': CarrierBossBarrier,
	'Drone': Drone,
	'CarrierBoss': CarrierBoss,
}