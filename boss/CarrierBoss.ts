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
		//let shape = getSegmentedRect( this.pos, this.width, this.width, 100 );
		let shape = Shape.makeCircle( this.pos, this.width, 16, -0.5 );

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
	speed: number = 4;

	stunned: boolean = false;

	coreMaterial = new Material( 30, 1.0, 0.5 );

	baseHealth = 5;
	health = this.baseHealth;

	/* property overrides */

	material = new Material( CarrierBoss.hue, 1.0, 0.5 );

	alpha: number = 1.0;
	flash: number = 0.0;

	savedVel = new Vec2();

	anim = new Anim( {
		//'pos': new PhysField( this, 'pos', 'vel', this.speed ), // high speed to maintain seek position
		'alpha': new AnimField( this, 'alpha', 0.1 ),
		'flash': new AnimField( this, 'flash', 0.1 ),
		'core-skewS': new AnimField( this.coreMaterial, 'skewS', 0.1 ), 

		// thread 1
		//'angle': new PhysField( this, 'angle', 'angleVel', 0.2 ), // not pointing, so doesn't need isAngle
	} );

	constructor( pos: Vec2, vel: Vec2 ) {
		super( pos, wallUnit * 2, wallUnit * 2 );

		this.vel = vel;
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeCircle( new Vec2( 0, 0 ), this.width, 12, 0 );
		shape.material = this.material
		shape.parent = this;

		for ( let i = 0; i < shape.edges.length; i++ ) {
			if ( ( i - 1 ) % 3 == 0 ) shape.edges[i].material = this.coreMaterial;
		}

		return [shape];
	}

	stun() {
		this.savedVel = this.vel.copy();
		this.vel.setValues( 0, 0 );
		this.angleVel = 0;

		this.stunned = true;

		this.anim.pushFrame( new AnimFrame( {
			'core-skewS': { value: -1.0 }
		} ) );
	}

	revive() {
		this.vel = this.savedVel.unit().times( this.speed );

		this.stunned = false;
		this.health = this.baseHealth;

		this.anim.pushFrame( new AnimFrame( {
			'core-skewS': { value: 0.0 }
		} ) );
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( !this.stunned ) {
				// this.vel.scale( 0.8 );

				// if ( this.vel.length() < 1 ) {
				// 	this.stun();
				// }
				this.angleVel *= 0.8

				this.health -= 1;
				if ( this.health <= 0 ) {
					this.stun();
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
		let now = new Date().getTime();

		this.material.skewL = this.flash;

		this.coreMaterial.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );
	}
}

type CarrierBossFlags = BossFlags & {
	stunned: boolean;
}

export class CarrierBoss extends Boss {
	flash: number = 0.0;

	flags: CarrierBossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false,
		stunned: false
	};

	wait: number = 0;

	shell: CenteredEntity;
	left: CenteredEntity;
	right: CenteredEntity;

	drones: Array<Drone> = [];
	gutters: Array<Gutter> = [];

	reviveSpeedPct: number = 0.33;
	reviveSpeedIncrease: number = 0.03; // rad/frame

	/* property overrides */

	attacks = attacks;
	overrideAttackField = 'CARRIER_ATK';

	flavorName = 'ORBIT CORE';

	maxHealth = 20;
	health = this.maxHealth;

	static hue: number = 250;

	material = new Material( CarrierBoss.hue, 1.0, 0.5 );

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

		this.shell = new CenteredEntity( new Vec2( 0, 0 ), this.width + 20, this.width + 20 );
		this.shell.presetShapes = [Shape.makeCircle( new Vec2( 0, 0 ), this.width + 20, 12 ) ];
		this.shell.presetShapes[0].material = new Material( CarrierBoss.hue, 1.0, 0.8 );
		this.shell.presetShapes[0].material.alpha = 0.8;
		this.shell.collisionGroup = COL.LEVEL;
		this.shell.collisionMask = COL.PLAYER_BULLET;
		this.anim.fields['shell-alpha'] = new AnimField( this.shell, 'alpha', 0.1 );
		this.addSub( this.shell );

		this.left = new CenteredEntity( new Vec2( this.width / 2 + wallUnit * 0.75, 0 ), wallUnit / 2, wallUnit );
		this.left.material = this.material;
		this.left.collisionGroup = COL.LEVEL;
		this.left.collisionMask = COL.PLAYER_BULLET;
		this.addSub( this.left );

		this.right = new CenteredEntity( new Vec2( this.width / 2 + wallUnit * 0.75, 0 ), wallUnit / 2, wallUnit );
		this.right.material = this.material;
		this.right.collisionGroup = COL.LEVEL;
		this.right.collisionMask = COL.PLAYER_BULLET;
		this.addSub( this.right );

		this.spawnDrone( 100, 0, new Vec2( 0, 0 ) );
		this.spawnDrone( 200, Math.PI, new Vec2( 0, 0 ) );//Vec2.fromPolar( Math.PI + -0.5 + Math.random(), 5 ) );

		if ( spawn ) {
			let barrier = new CarrierBossBarrier( this.pos.copy(), fieldWidth );
			this.spawnEntity( barrier );
			barrier.collisionGroup = COL.LEVEL;
		}

		this.messages.push( 'You are in a vast circular chamber.\n' );
		this.messages.push( 'The ORBIT CORE\'s shield generators are active.\n' );
	}

	spawnDrone( radius: number, angle: number, vel: Vec2 ) {
		let v = Vec2.fromPolar( 0, 1 );
		let drone = new Drone( v.times( radius ), vel );
		drone.angle = angle;

		//this.spawnEntity( drone );
		drone.collisionGroup = COL.LEVEL;
		drone.collisionMask = COL.LEVEL | COL.PLAYER_BULLET; // COL.LEVEL for hitting walls
		this.addSub( drone );
		this.drones.push( drone );

		let gutter = new Gutter( new Vec2( 0, 0 ), wallUnit, wallUnit / 2 );
		gutter.alpha = 0.3;
		this.spawnEntity( gutter );
		gutter.collisionGroup = COL.ENEMY_BULLET;

		let fieldName = 'gutter-' + this.gutters.length + '-alpha';
		this.anim.fields[fieldName] = new AnimField( gutter, 'alpha', 0.05 );

		this.gutters.push( gutter );
	}

	/* Entity overrides */

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( contact.sub instanceof Drone ) {
			contact.sub.hitWith( otherEntity, contact );

		} else {
			if ( otherEntity instanceof Bullet ) {
				otherEntity.removeThis = true;

				if ( contact.sub != this ) return;
				if ( this.invuln ) return;

				this.damage( 1 );
			}
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

	reviveDrones() {
		let healthLoss = 1 - this.getHealth() / this.maxHealth;
		// starts at 0.05 rad/frame, increases by 0.03 rad/frame per 33% of health lost
		let angleSpeed = ( 1 + Math.floor( healthLoss / this.reviveSpeedPct ) ) * this.reviveSpeedIncrease;

		for ( let drone of this.drones ) {
			drone.revive();

			drone.angleVel = angleSpeed / ( drone.pos.length() / 100 );
			//if ( drone.vel.length() == 0 ) {
				//drone.vel.set( Vec2.fromPolar( Math.PI * 2 * Math.random(), drone.speed ) );
			//}
		}

		this.flags['stunned'] = false;
	}

	defaultLogic() {
		/* flag checks */

		this.updateHealthFlags();

		/* attack change */

		/*if ( this.anim.isDone( [0] ) ) {
			this.chooseAttack();

			let start = Math.PI / 2;
			//this.anim.clear( { withoutTag: 'exit' } );

			// shoot_small
			if ( this.attack.name == 'shoot_small' ) {
				this.anim.pushFrame( new AnimFrame( {
					'wait': { value: 0, expireOnCount: 10000 }
				} ) );
			}
		}*/

		/* update attack */

		for ( let i = 0; i < this.drones.length; i++ ) {
			let worldPos = this.drones[i].applyTransform( new Vec2( 0, 0 ) );

			this.gutters[i].width = ( worldPos.minus( this.pos ) ).length();
			this.gutters[i].pos = ( worldPos.plus( this.pos ) ).times( 0.5 );
			this.gutters[i].angle = ( worldPos.minus( this.pos ) ).angle();

			if ( !this.flags['stunned'] && this.drones[i].stunned && this.gutters[i].alpha == 0.3 ) {
				let frame = new AnimFrame();
				frame.targets['gutter-' + i + '-alpha'] = new AnimTarget( 0.0 );
				this.anim.pushFrame( frame, { threadIndex: 1 } );
			}
		}

		let okDrones = this.drones.filter( x => !x.stunned );

		// seek midpoint of drones
		if ( okDrones.length > 0 ) {
			this.left.angle = this.drones[0].angle;//( this.drones[0].pos.minus( this.pos ) ).angle();
			this.right.angle = this.drones[1].angle;//( this.drones[1].pos.minus( this.pos ) ).angle();

			// this.anim.clear( { withTag: 'move' } );

			// this.anim.pushFrame( new AnimFrame( {
			// 	'pos': { value: ( this.drones[0].pos.plus( this.drones[1].pos ) ).times( 0.5 ) }
			// } ), { threadIndex: 1, tag: 'move' } );

		// open shell
		} else if ( okDrones.length == 0 && !this.flags['stunned'] ) {

			// restart drones
			this.anim.pushFrame( new AnimFrame( {}, [
				new FuncCall( this, 'reviveDrones', [] )
			] ) );

			// fade in gutters
			this.anim.pushFrame( new AnimFrame( {
				'gutter-0-alpha': { value: 0.3 },
				'gutter-1-alpha': { value: 0.3 },
			} ) );

			// fade in shell
			this.anim.pushFrame( new AnimFrame( {
				'shell-alpha': { value: 1.0 }
			} ) );

			// wait
			this.anim.pushFrame( new AnimFrame( {
				'wait': { value: 0, expireOnCount: 3000 }
			} ) );

			// fade out shell
			this.anim.pushFrame( new AnimFrame( {
				'shell-alpha': { value: 0.0 }
			} ) );

			this.flags['stunned'] = true;
		}

	}
}

export let constructors: Dict<Newable> = { 
	'CarrierBossBarrier': CarrierBossBarrier,
	'Drone': Drone,
	'CarrierBoss': CarrierBoss,
}