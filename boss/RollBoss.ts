import { Angle } from '../lib/juego/Angle.js'
import { Anim, AnimField, PhysField, AnimFrame, AnimTarget, TurnDir } from '../lib/juego/Anim.js'
import { Entity, cullList, TransformOrder } from '../lib/juego/Entity.js'
import { Contact } from '../lib/juego/Contact.js'
import { Material } from '../lib/juego/Material.js'
import { FuncCall } from '../lib/juego/serialization.js'
import { Shape } from '../lib/juego/Shape.js'
import { Sound } from '../lib/juego/Sound.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { Dict, discreteAccelDist } from '../lib/juego/util.js'

import { CenteredEntity } from '../CenteredEntity.js'
import { COL, MILLIS_PER_FRAME } from '../collisionGroup.js'
import { Explosion } from '../Explosion.js'
import { Bullet, Gutter } from '../Bullet.js'

import * as Debug from '../Debug.js'

import { Attack, AttackReq } from './Attack.js'
import { Boss, BossState, BossFlags } from './Boss.js'

export class Barrier extends CenteredEntity {
	altMaterial = new Material( 210, 1.0, 0.9 );

	// overrides
	material = new Material( 210, 1.0, 0.7 );
	drawWireframe = true;

	constructor( pos: Vec2, diameter: number ) {
		super( pos, diameter, diameter );
	}

	getShapes(): Array<Shape> {
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

let gunHealth = 10;

export class Gun extends CenteredEntity {
	flashMaterial = new Material( 60, 0.2, 0.5 );
	health = gunHealth;

	ready: boolean = true;
	fireInterval: number = 5000;

	/* property overrides */

	collisionGroup = COL.LEVEL;
	collisionMask = COL.PLAYER_BULLET;

	anim = new Anim( {
		'ready': new AnimField( this, 'ready' ),
		'flash': new AnimField( this.flashMaterial, 'lum' ),
		'emit': new AnimField( this.flashMaterial, 'emit' ),
		//'fireInterval': new AnimField( this, 'fireInterval' )

	}, new AnimFrame( {
		'ready': { value: true },
		'flash': { value: 0.5 },
		'emit': { value: 0.0 },
		//'fireInterval': { value: this.fireInterval }
	} ) );

	constructor( pos: Vec2=new Vec2( 0, 0 ), angle: number ) {
		super( pos, 20, 10 );

		this.angle = angle;

		this.material = new Material( 60, 0.0, 0.5 );
	}

	getDir(): Vec2 {
		return this.applyTransform( new Vec2( 1, 0 ), 0.0, { angleOnly: true } );
	}

	fire( towardPos?: Vec2 ): Entity | null {
		if ( !this.ready ) return null;

		let dir = this.getDir();

		if ( towardPos !== undefined ) {
			dir = this.unapplyTransform( towardPos ).unit();

			if ( dir.length() == 0 ) dir = this.getDir();
			else {
				this.applyTransform( dir, 0.0, { angleOnly: true } );
			}
		}

		this.anim.pushFrame( new AnimFrame( { 
			'ready': { value: false, expireOnCount: this.fireInterval },
			'flash': { value: 1.0, reachOnCount: this.fireInterval },
			'emit': { value: 0.5, reachOnCount: this.fireInterval },
		} ) );

		return new Bullet( 
			this.applyTransform( this.pos.copy() ), 
			dir.scale( 5 ) );
	}

	getOwnShapes(): Array<Shape> {
		let shapes = super.getOwnShapes();

		// make the short edges black
		shapes[0].edges[1].material = this.flashMaterial;
		shapes[0].edges[3].material = this.flashMaterial;

		/*let shell = Shape.fromPoints( [
			new Vec2( 0, 0 ),
			new Vec2( -this.pos.x, 40 ),
			new Vec2( -this.pos.x, -40 ) ] );

		shell.material = this.material;
		shell.parent = this;

		shapes.push( shell );*/

		return shapes;
	}
}

export class Balloon extends Bullet {
	alpha: number = 1.0;

	health: number = 1;

	anim = new Anim( {
		'width': new AnimField( this, 'width', 1 ),
		'height': new AnimField( this, 'height', 1 ),
		'alpha': new AnimField( this, 'alpha', 0.1 ),
		'removeThis': new AnimField( this, 'removeThis' ),
	}, new AnimFrame( {
		// empty
	} ) );

	constructor( pos: Vec2, vel: Vec2 ) {
		super( pos, vel );

		this.width = 30;
		this.height = 30;

		//this.angleVel = 0.02 * ( Math.random() > 0.5 ? -1: 1 );
	}

	update() {
		this.material.alpha = this.alpha;
	}

	hitWith( otherEntity: Entity ) {
		if ( this.health > 0 ) {
			if ( otherEntity instanceof Bullet ) {
				otherEntity.removeThis = true;
			}

			this.health -= 1;

			if ( this.health <= 0 ) {
				this.collisionGroup = 0;

				this.anim.pushFrame( new AnimFrame ( {
					'removeThis': { value: true }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					//'width': { value: this.width * 1.5 },
					//'height': { value: this.height * 1.5 },
					'alpha': { value: 0.0 },
				} ) );
			}
		}
	}
}

// IDEAS
// four more guns on middle rollers

// center gun beam attack
// center guns fly off and run around on the edge of the arena,
// do beam attack between them (strafe left/right or top down)
// player must hide between the rollers to avoid it (rollers are aligned with beam dir)

type State = BossState;

type RollBossFlags = BossFlags & {
	gun_count: number
	gun_half_count: number
}

let attacks = [
	// new Attack(
	// 	'horiz_seek',
	// 	[{ allOf: ['top-fat', 'bot-fat'] }]
	// ),
	new Attack(
		'tunnel_sweep',
		[{ allOf: ['top-skin', 'bot-skin'] } ]
	),
	// new Attack(
	// 	'guard',
	// 	[{ anyOf: ['top-fat', 'bot-fat'] } ]
	// ),
	// new Attack(
	// 	'gutter',
	// 	[{ anyOf: ['top-skin', 'bot-skin'] },
	// 	 { noneOf: ['top-fat', 'bot-fat'] }]
	// ),
	// new Attack(
	// 	'whirl',
	// 	[{ anyOf: ['top-skin', 'bot-skin'] },
	// 	 { noneOf: ['top-fat', 'bot-fat'] }]
	// ),	
	// new Attack(
	// 	'x_sweep',
	// 	[{ anyOf: ['top-skin', 'bot-skin'] },
	// 	 { noneOf: ['top-fat', 'bot-fat'] }]
	// ),
	// new Attack(
	// 	'slam',
	// 	[{ noneOf: ['top-fat', 'bot-fat'] }]
	// ),
	new Attack(
		'v_sweep',
		[{ noneOf: ['top-fat', 'bot-fat'] }]
	),
	new Attack(
		'potshot',
		[{ noneOf: ['top-fat', 'bot-fat'] }]
	),
	new Attack(
		'shed',
		[{ noneOf: ['top-fat', 'bot-fat'] }]
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
Debug.fields['ROLL_ATK'].default = attackNames.join( ',' );
Debug.validators['ROLL_ATK'] = Debug.arrayOfStrings( attackNames );

let rollerLength = 80;

export class Roller extends CenteredEntity {
	block: CenteredEntity;
	flash: number = 0.0;

	constructor( pos: Vec2 ) {
		super( pos, 0, 0 );

		this.isGhost = true;

		this.block = new CenteredEntity( new Vec2(), 20, rollerLength );
		this.block.material = new Material( 0, 1.0, 0.3 );
		this.block.altMaterial = new Material( 0, 1.0, 0.5 );
		this.block.collisionGroup = COL.LEVEL;
		this.block.collisionMask = COL.PLAYER_BULLET | COL.ENEMY_BULLET;
		this.block.transformOrder = TransformOrder.ROTATE_THEN_TRANSLATE;
		this.addSub( this.block );
	}

	shade() {
		this.block.altMaterial.skewL = this.block.material.skewL;
	}
}

export class RollBoss extends Boss {
	tops: Array<Roller> = []; // 225deg
	bottoms: Array<Roller> = []; // 45deg

	guns: Array<Gun> = [];

	/* behavior */

	state: State = BossState.SLEEP;
	attack: Attack = null;
	counter: Attack = null;

	fireOk: boolean = false;

	flags: RollBossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false,
		gun_count: 0,
		gun_half_count: 0,
	};

	flash: number = 0.0;

	wait: number = 0;

	tunnelPctSweepSpeed: number = 0.20;
	tunnelPrevSweepAngle: number = -1;
	tunnelPctFireInterval: number = 0.10;

	/* property overrides */

	attacks = attacks;
	overrideAttackField = 'ROLL_ATK';

	flavorName = 'ROLL CORE';

	maxHealth = 80;
	health = this.maxHealth;

	collisionGroup = COL.LEVEL;
	collisionMask = COL.PLAYER_BULLET;

	//doFire: boolean = true;
	//fireInterval: number = 2000;
	//doLockOn: boolean = true;
	//lockOnInterval: number = 10000;

	hitSound: Sound;

	topSound: Sound;
	bottomSound: Sound;

	//extendedSound: Sound = new Sound( './sfx/roll_extended.wav' );

	anim = new Anim( {
		'flash': new AnimField( this, 'flash' ),
		'invuln': new AnimField( this, 'invuln' ),
		'state': new AnimField( this, 'state' ),
		'fireOk': new AnimField( this, 'fireOk' ),
		'wait': new AnimField( this, 'wait' )
	},
	new AnimFrame( {
		'flash': { value: 0.0 },
		'invuln': { value: false },
		'fireOk': { value: false },
	} ) );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		// rollers
		let rollerBase = Math.abs( this.height / 2 );

		/*let roller = new Roller( new Vec2( 0, rollerBase + rollerLength * 0.5 ) );
		roller.block.name = 'top0-block';
		roller.angle = Math.PI / 2;
		this.tops.push( roller );

		roller = new Roller( new Vec2( 0, rollerBase + rollerLength * 1.5 ) );
		roller.block.name = 'top1-block';
		roller.angle = Math.PI / 2;
		this.tops.push( roller );

		roller = new Roller( new Vec2( 0, -rollerBase - rollerLength * 0.5 ) );
		roller.block.name = 'bottom0-block';
		roller.angle = Math.PI / 2;
		this.bottoms.push( roller );

		roller = new Roller( new Vec2( 0, -rollerBase - rollerLength * 1.5 ) );
		roller.block.name = 'bottom1-block';
		roller.angle = Math.PI / 2;
		this.bottoms.push( roller );*/

		for ( let i = 0; i < 4; i++ ) {
			let y = rollerBase + rollerLength * ( Math.floor( i / 2 ) + 0.5 );
			let prefix = 'bottom';
			let target = this.bottoms;

			if ( i % 2 == 0 ) {
				y *= -1;
				prefix = 'top';
				target = this.tops;
			}

			let l = target.length;

			let roller = new Roller( new Vec2( 0, y ) );
			roller.block.name = prefix + l + '-block';
			this.anim.fields[prefix + l + '-block-flash'] = new AnimField( roller, 'flash' ),
			this.anim.fields[prefix + l + '-angle'] = ( new PhysField( roller, 'angle', 'angleVel', 0.05, { isAngle: true } ) );
			this.anim.fields[prefix + l + '-block-angle'] = ( new PhysField( roller.block, 'angle', 'angleVel', 0.2, { isAngle: true } ) );
			roller.angle = Math.PI / 2;

			target.push( roller );
			this.addSub( roller );
		}

		this.anim.fields['top1-pos'] = new PhysField( this.tops[1], 'pos', 'vel', 3 );
		this.anim.fields['bottom1-pos'] = new PhysField( this.bottoms[1], 'pos', 'vel', 3 );

		this.anim.addGroup( 'roller-angle', ['top0-angle', 'top1-angle', 'bottom0-angle', 'bottom1-angle'] );
		this.anim.addGroup( 'top-arm-angle', ['top0-angle', 'top1-angle'] );
		this.anim.addGroup( 'bottom-arm-angle', ['bottom0-angle', 'bottom1-angle'] );

		// guns
		this.guns.push( new Gun( new Vec2( 10, 0 ), 0 ) );
		this.guns.push( new Gun( new Vec2( 10, 0 ), 0 ) );

		this.guns[0].fireInterval = 500;
		this.guns[1].fireInterval = 500;

		this.tops[0].block.addSub( this.guns[0] );
		this.bottoms[0].block.addSub( this.guns[1] );

		// arena
		if ( spawn ) {
			this.spawnEntity( new Barrier( this.pos.copy(), 640 ) );
		}

		this.maxHealth = this.getHealth();

		this.flags['gun_count'] = this.guns.length;
		this.flags['gun_half_count'] = this.guns.length;
		this.flags['health'] = this.getHealth();

		this.hitSound = new Sound( './sfx/roll_hit.wav', this.pos );

		this.topSound = new Sound( './sfx/roll_arm_grind.wav', this.pos, { loop: true, distScale: 1000 } );
		this.bottomSound = new Sound( './sfx/roll_arm_grind.wav', this.pos, { loop: true, distScale: 1000 } );

		this.messages.push( 'You are in a vast circular chamber.\n' );
		this.messages.push( 'The ROLL CORE lies dormant before you.\n' );
		this.messages.push( 'Take heed, traveler!.\n' );
		this.messages.push( 'Most only hear the clap of its terrible hands but once!\n' );
	}

	/* function overrides */

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}

	getBody(): Array<CenteredEntity> {
		let result: Array<CenteredEntity> = [this];

		result = result.concat( this.tops.map( x => x.block ) );
		result = result.concat( this.bottoms.map( x => x.block ) );

		return result;
	}

	getHealth(): number {
		let health = Math.max( this.health, 0 );

		return health;
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( contact.sub && contact.sub.parent && contact.sub.parent instanceof Roller ) {
				return;
			}

			if ( contact.sub instanceof Gun ) {
				return;
			}

			if ( this.invuln ) return;

			if ( this.state == BossState.SLEEP ) {
				this.state = BossState.DEFAULT;

				this.messages.push( 'The ROLL CORE stirs!\n' );
			}

			this.damage( 1 );

			this.hitSound.count = 1;
			this.hitSound.audio.currentTime = 0.0;
			this.anim.pushFrame( new AnimFrame ( {}, [
				new FuncCall<typeof this.addSound>( this, 'addSound', [this.hitSound] ),
			] ), { threadIndex: 1 } );
		}
	}

	/* logic */

	addSound( sound: Sound ) {
		this.sounds.push( sound );
	}

	removeSound( sound: Sound ) {
		let index = this.sounds.indexOf( sound );

		if ( index >= 0 ) {
			if ( this.sounds[index].audio ) {
				this.sounds[index].audio.pause();	
			}

			this.sounds.splice( index, 1 );
		}
	}

	setFireInterval( interval: number ) {
		for ( let gun of this.guns ) {
			gun.fireInterval = interval;
		}
	}

	retreat() {
		console.log( 'Retreating from attack ' + this.attack.name );
		this.anim.clear( { withoutTag: 'exit' } );
	}

	canEnter( attack: Attack ): boolean {
		if ( attack.name == 'tunnel_sweep' ) return true;
		
		if ( attack.name == 'potshot' ) return false;
		if ( attack.name == 'v_sweep' ) return false;
		if ( attack.name == 'shed' ) return false;

		return false;
	}

	defaultLogic() {
		/* flag checks */

		this.updateHealthFlags();

		/* attack change */

		if ( this.anim.isDone( [0] ) ) {
			this.chooseAttack();

			let start = Math.PI / 2;

			let startFrame = new AnimFrame( {
				'roller-angle': { value: start, overrideRate: 0.05 },
				'fireOk': { value: false },
			} );
			
			let watchAngle = this.watchTarget.angle() - this.tops[0].angle; // -360 to 360, relative to arms
			let inBack = Math.abs( Angle.normalize( watchAngle ) ) > Math.PI / 2;
			let gunHome = 0;
			if ( inBack ) gunHome = Math.PI;

			let halfAngle = Angle.normalize( this.watchTarget.angle() - gunHome ); // watchTarget.angle() mod 180

			let targetPos = new Vec2( 0, Math.max( this.watchTarget.length(), this.bottoms[1].pos.y ) );

			// tunnel_sweep
			if ( this.attack.name == 'tunnel_sweep' ) {

				// exit
				this.anim.pushFrame( new AnimFrame( {
					//'roller-angle': { value: start, overrideRate: 0.05 },
					'fireOk': { value: false },
				} ), { tag: 'exit' } );

				// attack
				let sweepAngle = ( 0.5 + Math.random() * 0.5 ); // 30 to 60 degrees
				if ( this.tunnelPrevSweepAngle > 0 ) sweepAngle *= -1;
				this.tunnelPrevSweepAngle = sweepAngle; 

				let healthLoss = 1 - this.getHealth() / this.maxHealth;

				// starts at 0.005rad/frame, increases by 0.005rad/frame per 20% of health lost 
				let sweepSpeed = ( 1 + Math.floor( healthLoss / this.tunnelPctSweepSpeed ) ) * 0.005 + 0.005;

				// starts at 3000ms, decreases to 500ms over the first 50% of health lost (500ms per 10%)
				let fireInterval = ( 6 - Math.min( Math.floor( healthLoss / this.tunnelPctFireInterval ), 5 ) ) * 500;

				this.setFireInterval( fireInterval );

				this.anim.pushFrame( new AnimFrame( {
					'roller-angle': { value: halfAngle + sweepAngle, overrideRate: sweepSpeed },
					'fireOk': { value: true },
				} ) );

				// aim
				this.anim.pushFrame( new AnimFrame( {
					'roller-angle': { value: halfAngle, overrideRate: sweepSpeed * 2 },
				 	'fireOk': { value: false },
				} ) );
			
			// slam
			} else if ( this.attack.name == 'slam' ) {
				let targetAngle = this.watchTarget.angle();
				let targetPos = new Vec2( 0, Math.max( this.watchTarget.length(), this.bottoms[1].pos.y ) );

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'top1-pos': { value: this.tops[1].pos.copy(), overrideRate: 10 },
					'bottom1-pos': { value: this.bottoms[1].pos.copy(), overrideRate: 10 },

					//'top1-block-angle': { value: 0, overrideRate: 0.2 },
					//'bottom1-block-angle': { value: 0, overrideRate: 0.2 }
				} ), { tag: 'exit' } );

				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle, overrideRate: 0.1, turnDir: TurnDir.CCW },
					'bottom-arm-angle': { value: targetAngle, overrideRate: 0.1, turnDir: TurnDir.CW },
				} ), { tag: 'exit' } );

				// attack
				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle + Math.PI / 2 - 0.01, overrideRate: 0.2, turnDir: TurnDir.CW },
					'bottom-arm-angle': { value: targetAngle - Math.PI / 2 + 0.01, overrideRate: 0.2, turnDir: TurnDir.CCW },
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle, overrideRate: 0.05, turnDir: TurnDir.CW },
					'bottom-arm-angle': { value: targetAngle, overrideRate: 0.05, turnDir: TurnDir.CCW },
				} ) );

				// aim
				this.anim.pushFrame( new AnimFrame( {
					'top1-pos': { value: targetPos.times( -1 ), overrideRate: 10 },
					'bottom1-pos': { value: targetPos, overrideRate: 10 },

					//'top1-block-angle': { value: Math.PI, overrideRate: 0.2 },
					//'bottom1-block-angle': { value: -Math.PI, overrideRate: 0.2 }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle - Math.PI / 2 + 0.2, overrideRate: 0.1 },
					'bottom-arm-angle': { value: targetAngle + Math.PI / 2 - 0.2, overrideRate: 0.1 },

					'fireOk': { value: false },
				} ) );

			// potshot
			} else if ( this.attack.name == 'potshot' ) {
				let top0pos = this.tops[0].applyTransform( new Vec2( 0, 0 ) );
				let bot0pos = this.bottoms[0].applyTransform( new Vec2( 0, 0 ) );

				let watchPos = this.watchTarget.plus( this.pos );

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'fireOk': { value: false },
					//'top0-block-angle': { value: gunHome },
					//'bottom0-block-angle': { value: gunHome },
				} ), { tag: 'exit' } );

				// fire
				this.anim.pushFrame( new AnimFrame( {
					'fireOk': { value: true }, 
					'wait': { value: 0, expireOnCount: 500 }
				} ) );

				// prepare
				let ta = Angle.normalize( watchPos.minus( top0pos ).angle() - this.tops[0].angle - gunHome );
				//ta = Math.max( ta, -Math.PI * 3 / 4 );  
				//ta = Math.min( ta, Math.PI * 3 / 4 );

				let ba = Angle.normalize( watchPos.minus( bot0pos ).angle() - this.bottoms[0].angle - gunHome );
				//ba = Math.max( ba, -Math.PI * 3 / 4 );
				//ba = Math.min( ba, Math.PI * 3 / 4 );

				this.anim.pushFrame( new AnimFrame( {
					'top0-block-angle': { value: ta + gunHome },
					'bottom0-block-angle': { value: ba + gunHome },
				} ) );
			
			// v_sweep
			} else if ( this.attack.name == 'v_sweep' ) {

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'fireOk': { value: false },
					'top-arm-angle': { value: halfAngle },
					'bottom-arm-angle': { value: halfAngle },

					'top1-pos': { value: this.tops[1].pos.copy(), overrideRate: 10 },
					'bottom1-pos': { value: this.bottoms[1].pos.copy(), overrideRate: 10 },
				} ), { tag: 'exit' } );

				this.anim.pushFrame( new AnimFrame( { 
					'wait': { value: 0, expireOnCount: 500 }
				} ) );

				// sweep
				if ( inBack ) {
					this.anim.pushFrame( new AnimFrame( {
						'fireOk': { value: true },
						'top-arm-angle': { value: halfAngle - Math.PI / 2 + 0.5, overrideRate: 0.01 },
						'bottom-arm-angle': { value: halfAngle + Math.PI / 2 - 0.5, overrideRate: 0.01 },
					} ) );
				} else {
					this.anim.pushFrame( new AnimFrame( {
						'fireOk': { value: true },
						'top-arm-angle': { value: halfAngle + Math.PI / 2 - 0.5, overrideRate: 0.01 },
						'bottom-arm-angle': { value: halfAngle - Math.PI / 2 + 0.5, overrideRate: 0.01 },
					} ) );
				}

				// prepare
				this.anim.pushFrame( new AnimFrame( {
					'fireOk': { value: true },
					'top-arm-angle': { value: halfAngle },
					'bottom-arm-angle': { value: halfAngle },

					'top1-pos': { value: targetPos.times( -1 ), overrideRate: 10 },
					'bottom1-pos': { value: targetPos, overrideRate: 10 },
				} ) );
			
			// shed
			} else if ( this.attack.name == 'shed' ) {
				let sign = -1;
				
				/*
					halfAngle:
					  -90               			
				180 --o-- 0
					  90				

					right (top) arm angle:
					
					|
					o   0

					o-- 90

					o   180
					|

				  --o 	-90	

					quadrant (relative to right arm):
										
					1   2
					--o--
					0   3 			
				*/

				let quadrant = Math.floor( watchAngle / ( Math.PI / 2 ) );
				if ( quadrant % 2 ) sign = 1; // positive rotation in quadrants 1 and 3, negative in 2 and 4

				let sweepAngle = 1.5 * Math.PI / 2 + Math.random() * Math.PI / 4;
				
				let startAngle = this.tops[0].angle;

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'top1-pos': { value: this.tops[1].pos.copy(), overrideRate: 10 },
					'bottom1-pos': { value: this.bottoms[1].pos.copy(), overrideRate: 10 },
				} ), { tag: 'exit' } );

				// sweep
				this.anim.pushFrame( new AnimFrame( {
					'roller-angle': { value: startAngle + sweepAngle * sign, overrideRate: 0.1 },
				} ) );

				// windup
				this.anim.pushFrame( new AnimFrame( {
					'roller-angle': { value: startAngle + 0.3 * sign },
				} ) );

				// aim
				this.anim.pushFrame( new AnimFrame( {
					'wait': { value: 0, expireOnCount: 500 },

					'top1-pos': { value: targetPos.times( -1 ), overrideRate: 10 },
					'bottom1-pos': { value: targetPos, overrideRate: 10 },
				} ) );
			} 	

			// TODO: move this into attack branches
			if ( this.attack.name == 'tunnel_sweep' || this.attack.name == 'v_sweep' || this.attack.name == 'shed' ) {
				this.anim.pushFrame( new AnimFrame( {
					'top0-block-angle': { value: gunHome },
					'bottom0-block-angle': { value: gunHome },
				} ) );
			}
		}

		/* update attack */

		if ( this.attack ) {
			if ( this.attack.name != 'shed' ) {//this.attack.name == 'tunnel_sweep' || this.attack.name == 'v_sweep' ) {
				// if ( this.flags['current_attack_damage'] > 5 ) {
				// 	this.anim.clear( { withoutTag: 'exit' } );
				// 	this.counter = getAttack( 'shed' );
				// }

				if ( this.watchTarget.length() < 100 && this.attack.name != 'potshot' ) {
					this.anim.clear( { withoutTag: 'exit' } );
					this.counter = getAttack( 'potshot' );
				}
			}
		}

		if ( this.fireOk ) {
			for ( let gun of this.guns ) {
				let bullet = gun.fire();

				if ( bullet ) {
					this.spawnEntity( bullet );
					bullet.collisionGroup = COL.ENEMY_BULLET;
					bullet.collisionMask = COL.PLAYER_BULLET;
				}
			}
		}
	}

	/* drawing */

	shade() {
		for ( let top of this.tops ) {
			top.block.material.skewL = Math.max( this.flash, top.flash );
		}
		for ( let bottom of this.bottoms ) {
			bottom.block.material.skewL = Math.max( this.flash, bottom.flash );
		}

		super.shade();
	}
}