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

	collisionGroup = COL.ENEMY_BODY;
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
					'removeThis': { value: true, expireOnReach: true }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					//'width': { value: this.width * 1.5 },
					//'height': { value: this.height * 1.5 },
					'alpha': { value: 0.0, expireOnReach: true },
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
	new Attack(
		'horiz_seek',
		[{ allOf: ['top-fat', 'bot-fat'] }]
	),
	new Attack(
		'tunnel_sweep',
		[{ allOf: ['top-skin', 'bot-skin'] } ]
	),
	new Attack(
		'guard',
		[{ anyOf: ['top-fat', 'bot-fat'] } ]
	),
	new Attack(
		'gutter',
		[{ anyOf: ['top-skin', 'bot-skin'] },
		 { noneOf: ['top-fat', 'bot-fat'] }]
	),
	new Attack(
		'whirl',
		[{ anyOf: ['top-skin', 'bot-skin'] },
		 { noneOf: ['top-fat', 'bot-fat'] }]
	),	
	new Attack(
		'x_sweep',
		[{ anyOf: ['top-skin', 'bot-skin'] },
		 { noneOf: ['top-fat', 'bot-fat'] }]
	),
	new Attack(
		'slam',
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
		this.block.collisionGroup = COL.ENEMY_BODY;
		this.block.collisionMask = COL.PLAYER_BULLET | COL.ENEMY_BULLET;
		this.block.transformOrder = TransformOrder.ROTATE_THEN_TRANSLATE;
		this.addSub( this.block );
	}

	shade() {
		this.block.altMaterial.skewL = this.block.material.skewL;
	}
}

export class RollBoss extends Boss {
	//axis = new CenteredEntity( new Vec2( 0, 0 ), 0, 0 );

	//laserAxis = new CenteredEntity( new Vec2( 0, 0 ), 0, 0 );
	//topLaser: CenteredEntity;
	//bottomLaser: CenteredEntity;

	tops: Array<Roller> = []; // 225deg
	bottoms: Array<Roller> = []; // 45deg

	guns: Array<Gun> = [];

	/* behavior */

	state: State = BossState.SLEEP;
	attack: Attack = null;
	counter: Attack = null;

	fireFat: boolean = false;
	fireSkin: boolean = false;
	staggerFat: boolean = false;

	flags: RollBossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false,
		gun_count: 0,
		gun_half_count: 0,
	};

	flash: number = 0.0;

	/* property overrides */

	flavorName = 'ROLL CORE';

	health = 80;

	collisionGroup = COL.ENEMY_BODY;
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
		'fireFat': new AnimField( this, 'fireFat' ),
		'fireSkin': new AnimField( this, 'fireSkin' ),
		'staggerFat': new AnimField( this, 'staggerFat' )
	},
	new AnimFrame( {
		'flash': { value: 0.0 },
		'invuln': { value: false },
		'fireFat': { value: false },
		'fireSkin': { value: false },
		'staggerFat': { value: false },
	} ) );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		// rollers
		let rollerBase = Math.abs( this.height / 2 );

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
			this.anim.fields[prefix + l + '-block-angle'] = ( new PhysField( roller.block, 'angle', 'angleVel', 0.05, { isAngle: true } ) );
			roller.angle = 0;
			//this.anim.default.targets[prefix + l + '-angle'] = new AnimTarget( roller.angle );
			//this.anim.default.targets[prefix + l + '-block-angle'] = new AnimTarget( 0 );

			target.push( roller );
			this.addSub( roller );
		}

		for ( let bottom of this.bottoms ) {
			bottom.angle = Math.PI; 
		}

		this.anim.fields['top1-pos'] = new PhysField( this.tops[1], 'pos', 'vel', 3 );
		this.anim.fields['bottom1-pos'] = new PhysField( this.bottoms[1], 'pos', 'vel', 3 );
		//this.anim.default.targets['top1-pos'] = new AnimTarget( this.tops[1].pos.copy() );
		//this.anim.default.targets['bottom1-pos'] = new AnimTarget( this.bottoms[1].pos.copy() );

		this.anim.addGroup( 'roller-angle', ['top0-angle', 'top1-angle', 'bottom0-angle', 'bottom1-angle'] );
		this.anim.addGroup( 'top-arm-angle', ['top0-angle', 'top1-angle'] );
		this.anim.addGroup( 'bottom-arm-angle', ['bottom0-angle', 'bottom1-angle'] );

		// front balloon guns
		this.guns.push( new Gun( new Vec2( 10, 0 ), 0 ) );
		this.guns.push( new Gun( new Vec2( 10, 0 ), 0 ) );

		this.guns[0].height = 40;
		this.guns[1].height = 40;

		this.tops[1].block.addSub( this.guns[0] );
		this.bottoms[1].block.addSub( this.guns[1] );

		this.guns[0].name = 'top-fat';
		this.guns[1].name = 'bot-fat';

		// rear guns
		this.guns.push( new Gun( new Vec2( 10, 0 ), 0 ) );
		this.guns.push( new Gun( new Vec2( 10, 0 ), 0 ) );

		this.guns[2].angle = Math.PI;
		this.guns[2].fireInterval = 500;
		this.guns[3].angle = Math.PI;
		this.guns[3].fireInterval = 500;

		this.tops[0].block.addSub( this.guns[2] );
		this.bottoms[0].block.addSub( this.guns[3] );

		this.guns[2].name = 'top-skin';
		this.guns[3].name = 'bot-skin';

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


	cull() {
		super.cull();

		cullList( this.guns );
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

			if ( this.invuln ) return;

			if ( this.state == BossState.SLEEP ) {
				this.state = BossState.DEFAULT;

				this.messages.push( 'The ROLL CORE stirs!\n' );
			}

			if ( contact.sub instanceof Gun ) {
				contact.sub.health -= 1;

				if ( contact.sub.parent ) {
					let paramKey = contact.sub.parent.name + '-flash';

					if ( paramKey in this.anim.fields ) {
						let frame = new AnimFrame( {} );
						frame.targets[paramKey] = new AnimTarget( 0.0, { overrideRate: 0.1 } );
						this.anim.pushFrame( frame, { threadIndex: 1, tag: 'exit' } );

						frame = new AnimFrame( {} );
						frame.targets[paramKey] = new AnimTarget( 0.5, { overrideRate: 0 } );
						this.anim.pushFrame( frame, { threadIndex: 1 } );
					}
				}

				if ( this.attack && this.attack.name == 'guard' ) {
					let stagger = Math.PI / 8;

					if ( contact.sub.name == 'top-fat' ) {
						let val = Math.max( this.tops[0].angle - stagger, Math.PI / 2 );

						this.anim.clear( { withTag: 'staggerTop' } );
						this.anim.pushFrame( new AnimFrame( {
							'top-arm-angle': { value: val, expireOnReach: true, overrideRate: 0.05 },
							'top1-block-angle': { value: Math.PI / 2 - val, overrideRate: 0.05 },
						} ), { tag: 'staggerTop' } );

					} else if ( contact.sub.name == 'bot-fat' ) {
						let val = Math.min( this.bottoms[0].angle + stagger, Math.PI / 2 );

						this.anim.clear( { withTag: 'staggerBottom' } );
						this.anim.pushFrame( new AnimFrame( {
							'bottom-arm-angle': { value: val, expireOnReach: true, overrideRate: 0.05 },
							'bottom1-block-angle': { value: Math.PI / 2 - val, overrideRate: 0.05 },
						} ), { tag: 'staggerBottom' } );
					}
				}

				if ( contact.sub.health <= 0 ) {
					contact.sub.destructor();
				}

			} else {
				this.health -= 1;

				this.anim.pushFrame( new AnimFrame( {
					'flash': { value: 0.0, expireOnReach: true, overrideRate: 0.1 },
				} ), { threadIndex: 1, tag: 'exit' } );
				this.anim.pushFrame( new AnimFrame( {
					'flash': { value: 0.5, expireOnReach: true },
				} ), { threadIndex: 1 } );

				this.hitSound.count = 1;
				this.hitSound.audio.currentTime = 0.0;
				this.anim.pushFrame( new AnimFrame ( {}, [
					new FuncCall<typeof this.addSound>( this, 'addSound', [this.hitSound] ),
				] ), { threadIndex: 1 } );

				this.doEyeStrain();

				if ( this.health <= 0 ) {
					this.doEyeDead();
					this.state = BossState.EXPLODE;

					this.anim.clear();
				}
			}

			let str = 'RollBoss health: ' + this.health;
			for ( let gun of this.guns ) {
				str += ' ' + gun.health;
			}

			console.log( str );
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

	staggerFatGuns() {
		let fatGuns = this.guns.filter( x => x.name.includes( 'fat' ) );
		for ( let i = 0; i < fatGuns.length; i++ ) {
			fatGuns[i].anim.clear();

			if ( i > 0 ) {
				fatGuns[i].anim.pushFrame( new AnimFrame( { 
					'ready': { value: false, expireOnCount: i * fatGuns[i].fireInterval / fatGuns.length },
					'flash': { value: 1.0, reachOnCount: i * fatGuns[i].fireInterval / fatGuns.length },
				} ) );
			}
		}
	}

	setSkinInterval( interval: number ) {
		for ( let gun of this.guns ) {
			if ( gun.name.includes( 'skin' ) ) {
				gun.fireInterval = interval;
			}
		}
	}

	retreat() {
		console.log( 'Retreating from attack ' + this.attack.name );
		this.anim.clear( { withoutTag: 'exit' } );
	}

	defaultLogic() {

		//this.topSound.pos = this.tops[1].applyTransform( new Vec2() );
		//this.bottomSound.pos = this.bottoms[1].applyTransform( new Vec2() );

		// flags

		let present = this.guns.map( x => x.name );

		if ( !Debug.flags.FORCE_BOSS_ATK ) {
			if ( this.attack && !this.attack.canEnter( present ) ) {
				this.retreat();
			}
		}

		/* begin attack */

		let health = this.getHealth();
		if ( health < this.flags['health'] ) {
			this.flags['current_attack_damage'] += this.flags['health'] - health;
			this.flags['health'] = health;
		}

		if ( this.anim.isDone( [0] ) ) {

			if ( Debug.flags.FORCE_BOSS_ATK ) {
				let names = Debug.fields.ROLL_ATK.value.split( ',' );
				let debugAttacks = attacks.filter( x => names.includes( x.name ) );

				if ( debugAttacks.length > 0 ) {
					let index = Math.floor( Math.random() * debugAttacks.length )
					this.attack = debugAttacks[index];

				} else {
					console.warn( 'RollBoss.defaultLogic: no valid attacks from debug' );
				}

			} else if ( !this.attack ) {
				this.attack = getAttack( 'horiz_seek' );

			} else if ( this.counter ) {
				this.attack = this.counter;
				this.counter = null;

			} else {
				let possibleAttacks = attacks.filter( x => x.canEnter( present ) );

				if ( this.attack && possibleAttacks.length > 1 ) {
					possibleAttacks = possibleAttacks.filter( x => x != this.attack );
				}

				if ( possibleAttacks.length == 0 ) {
					this.messages.push( 'The ROLL CORE surrenders!\n' );
					this.state = BossState.DEAD;
					return;
				}

				let index = Math.floor( Math.random() * possibleAttacks.length )
				this.attack = possibleAttacks[index];
			}

			console.log( 'Beginning attack ' + this.attack.name ); // + ' (' + possibleAttacks.map( x => x.name ) + ')' );
			this.flags['current_attack_damage'] = 0;

			let start = Math.PI / 2;
			this.anim.clear( { withoutTag: 'exit' } );

			let startFrame = new AnimFrame( {
				'roller-angle': { value: start, expireOnReach: true, overrideRate: 0.05 },
				'fireFat': { value: false },
				'fireSkin': { value: false },
			} );

			// horiz_seek
			if ( this.attack.name == 'horiz_seek' ) {
				this.staggerFatGuns();

				this.anim.pushFrame( new AnimFrame( {
					'fireFat': { value: true, expireOnCount: 10000 },
				} ) );

				this.anim.pushFrame( startFrame );
			
			// tunnel_sweep
			} else if ( this.attack.name == 'tunnel_sweep' ) {

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'top1-pos': { value: this.tops[1].pos.copy(), expireOnReach: true, overrideRate: 10 },
					'bottom1-pos': { value: this.bottoms[1].pos.copy(), overrideRate: 10 },
				} ), { tag: 'exit' } );

				this.anim.pushFrame( new AnimFrame( {
					'roller-angle': { value: start, expireOnReach: true, overrideRate: 0.05 },
					'fireFat': { value: false },
					'fireSkin': { value: false },
				} ), { tag: 'exit' } );

				// attack
				let sweepAngle = ( 0.5 + Math.random() * 0.5 ) * ( Math.random() > 0.5 ? -1: 1 );

				this.anim.pushFrame( new AnimFrame( {
					'roller-angle': { value: Math.PI + this.watchTarget.angle() + sweepAngle, expireOnReach: true, overrideRate: 0.01 },
					'fireSkin': { value: true },
				} ) );

				// aim
				this.anim.pushFrame( new AnimFrame( {
					'roller-angle': { value: Math.PI + this.watchTarget.angle(), expireOnReach: true, overrideRate: 0.05 },
					'fireFat': { value: false },
					'fireSkin': { value: false },
					'top1-pos': { value: this.tops[1].pos.minus( new Vec2( 0, rollerLength ) ), expireOnReach: true },
					'bottom1-pos': { value: this.bottoms[1].pos.plus( new Vec2( 0, rollerLength ) ) },
				} ) );

				this.anim.pushFrame( startFrame );
			
			// guard
			} else if ( this.attack.name == 'guard' ) {
				let jawAngle = 0.8 * Math.PI / 2;

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: Math.PI / 2, expireOnReach: true },
					'bottom-arm-angle': { value: Math.PI / 2, expireOnReach: true },

					'top1-block-angle': { value: 0, expireOnReach: true },
					'bottom1-block-angle': { value: 0, expireOnReach: true },
				} ), { tag: 'exit' } );

				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: Math.PI / 2 + jawAngle, expireOnCount: 8000 },
					'bottom-arm-angle': { value: Math.PI / 2 - jawAngle },

					'top1-block-angle': { value: -jawAngle },
					'bottom1-block-angle': { value: +jawAngle },
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'fireFat': { value: true, expireOnReach: true },
				} ) );

				this.anim.pushFrame( startFrame );

			// gutter
			} else if ( this.attack.name == 'gutter' ) {

				let spinRate = 0.06;
				let target = Math.PI * 2 * ( Math.random() > 0.5 ? -1 : 1 );

				let targetPos = new Vec2( 0, Math.max( this.watchTarget.length(), this.bottoms[1].pos.y ) );

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'top0-block-angle': { value: 0, expireOnReach: true, overrideRate: 0.2 },
					'bottom0-block-angle': { value: 0, overrideRate: 0.2 },

					'top1-pos': { value: this.tops[1].pos.copy(), expireOnReach: true, overrideRate: 10 },
					'bottom1-pos': { value: this.bottoms[1].pos.copy(), overrideRate: 10 },

					'top1-angle': { value: Math.PI / 2, expireOnReach: true, overrideRate: spinRate },
					'bottom1-angle': { value: Math.PI / 2, overrideRate: spinRate }
				}, [
					new FuncCall<typeof this.setSkinInterval>( this, 'setSkinInterval', [500] )
				] ), { tag: 'exit' } );

				// attack
				this.anim.pushFrame( new AnimFrame( {
					'top1-angle': { value: start + target, expireOnReach: true, overrideRate: spinRate, isSpin: true },
					'bottom1-angle': { value: start + target, overrideRate: spinRate, isSpin: true }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'fireSkin': { value: true, expireOnReach: true },
				}, [
					new FuncCall<typeof this.setSkinInterval>( this, 'setSkinInterval', [250] )
				] ) );

				// prepare
				this.anim.pushFrame( new AnimFrame( {
					'top0-block-angle': { value: Math.PI / 2, expireOnReach: true, overrideRate: 0.2 },
					'bottom0-block-angle': { value: -Math.PI / 2, overrideRate: 0.2 },

					'top1-pos': { value: targetPos.times( -1 ) , expireOnReach: true, overrideRate: 10 },
					'bottom1-pos': { value: targetPos, overrideRate: 10 },
				} ) );

				this.anim.pushFrame( startFrame );

			// whirl
			} else if ( this.attack.name == 'whirl' ) {

				let spinRate = 0.05 + Math.random() * 0.01;
				let target = Math.PI * 2 * ( Math.random() > 0.5 ? -1 : 1 );

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'top0-block-angle': { value: 0, expireOnReach: true, overrideRate: 0.2 },
					'bottom0-block-angle': { value: 0, overrideRate: 0.2 },

					'top0-angle': { value: Math.PI / 2, expireOnReach: true, overrideRate: spinRate },
					'bottom0-angle': { value: Math.PI / 2, overrideRate: spinRate }
				}, [
					new FuncCall<typeof this.setSkinInterval>( this, 'setSkinInterval', [500] )
				] ), { tag: 'exit' } );

				// attack
				this.anim.pushFrame( new AnimFrame( {
					'top0-angle': { value: start + target, expireOnReach: true, overrideRate: spinRate, isSpin: true },
					'bottom0-angle': { value: start + target, overrideRate: spinRate, isSpin: true }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'fireSkin': { value: true, expireOnReach: true },
				}, [
					new FuncCall<typeof this.setSkinInterval>( this, 'setSkinInterval', [150] )
				] ) );

				// prepare
				this.anim.pushFrame( new AnimFrame( {
					'top0-block-angle': { value: Math.PI / 2, expireOnReach: true, overrideRate: 0.2 },
					'bottom0-block-angle': { value: -Math.PI / 2, overrideRate: 0.2 }
				} ) );

				this.anim.pushFrame( startFrame );

			// x_sweep
			} else if ( this.attack.name == 'x_sweep' ) {
				let jawAngle = ( 0.1 + Math.random() * 0.7 ) * Math.PI / 2;

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'fireSkin': { value: false },
					'top0-block-angle': { value: 0, expireOnReach: true, overrideRate: 0.2 }, // go slower to let bullets pass
					'bottom0-block-angle': { value: 0, overrideRate: 0.2 }
				} ) );

				// attack
				this.anim.pushFrame( new AnimFrame( {
					'top0-angle': { value: Math.PI / 2 + jawAngle, expireOnReach: true, overrideRate: 0.02 },
					'bottom0-angle': { value: Math.PI / 2 - jawAngle, overrideRate: 0.02 }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'fireSkin': { value: true, expireOnReach: true },
				} ) );

				// prepare
				this.anim.pushFrame( new AnimFrame( {
					'top1-angle': { value: Math.PI / 2 + jawAngle, expireOnReach: true },
					'bottom1-angle': { value: Math.PI / 2 - jawAngle },

					'top0-angle': { value: Math.PI / 2 - Math.PI / 4, expireOnReach: true },
					'bottom0-angle': { value: Math.PI / 2 + Math.PI / 4, expireOnReach: true },

					'top0-block-angle': { value: Math.PI, expireOnReach: true, overrideRate: 0.2 },
					'bottom0-block-angle': { value: -Math.PI, overrideRate: 0.2 }
				} ) );

				this.anim.pushFrame( startFrame );
			
			// slam
			} else if ( this.attack.name == 'slam' ) {
				let targetAngle = this.watchTarget.angle();
				let targetPos = new Vec2( 0, Math.max( this.watchTarget.length(), this.bottoms[1].pos.y ) );

				// exit
				this.anim.pushFrame( new AnimFrame( {
					'top1-pos': { value: this.tops[1].pos.copy(), expireOnReach: true, overrideRate: 10 },
					'bottom1-pos': { value: this.bottoms[1].pos.copy(), overrideRate: 10 },

					//'top1-block-angle': { value: 0, expireOnReach: true, overrideRate: 0.2 },
					//'bottom1-block-angle': { value: 0, overrideRate: 0.2 }
				} ), { tag: 'exit' } );

				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle, expireOnReach: true, overrideRate: 0.1, turnDir: TurnDir.CCW },
					'bottom-arm-angle': { value: targetAngle, expireOnReach: true, overrideRate: 0.1, turnDir: TurnDir.CW },
				} ), { tag: 'exit' } );

				// attack
				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle + Math.PI / 2 - 0.01, expireOnReach: true, overrideRate: 0.2, turnDir: TurnDir.CW },
					'bottom-arm-angle': { value: targetAngle - Math.PI / 2 + 0.01, expireOnReach: true, overrideRate: 0.2, turnDir: TurnDir.CCW },
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle, expireOnReach: true, overrideRate: 0.05, turnDir: TurnDir.CW },
					'bottom-arm-angle': { value: targetAngle, expireOnReach: true, overrideRate: 0.05, turnDir: TurnDir.CCW },
				} ) );

				// aim
				this.anim.pushFrame( new AnimFrame( {
					'top1-pos': { value: targetPos.times( -1 ) , expireOnReach: true, overrideRate: 10 },
					'bottom1-pos': { value: targetPos, overrideRate: 10 },

					//'top1-block-angle': { value: Math.PI, expireOnReach: true, overrideRate: 0.2 },
					//'bottom1-block-angle': { value: -Math.PI, overrideRate: 0.2 }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'top-arm-angle': { value: targetAngle - Math.PI / 2 + 0.2, expireOnReach: true, overrideRate: 0.1 },
					'bottom-arm-angle': { value: targetAngle + Math.PI / 2 - 0.2, expireOnReach: true, overrideRate: 0.1 },

					'fireFat': { value: false },
					'fireSkin': { value: false },
				} ) );
			}
		}

		/* update attack */
		if ( this.attack ) {
			if ( this.attack.name == 'gutter' ) {
				if ( this.flags['current_attack_damage'] > 5 ) {
					this.counter = getAttack( 'whirl' );
					this.retreat();
				}

			} else if ( this.attack.name == 'horiz_seek' ) {
				if ( this.flags['current_attack_damage'] > 5 ) {
					this.counter = getAttack( 'guard' );
					this.retreat();
				}

			} else if ( this.attack.name == 'tunnel_sweep' ) {
				if ( this.flags['current_attack_damage'] > 5 ) {
					this.retreat();
				}
			}
		}

		for ( let gun of this.guns ) {
			if ( gun.name.includes( 'fat' ) && !this.fireFat ) continue;
			if ( gun.name.includes( 'skin' ) && !this.fireSkin ) continue;

			if ( this.fireFat && !this.staggerFat ) {
				this.staggerFatGuns();
				this.staggerFat = true;
			}

			let bullet;

			if ( gun.name.includes( 'fat' ) ) {
				bullet = gun.fire( this.watchTarget.plus( this.pos ) );
			} else {
				bullet = gun.fire();
			}

			if ( bullet ) {
				this.spawnEntity( bullet );
				bullet.collisionGroup = COL.ENEMY_BULLET;
				bullet.collisionMask = COL.PLAYER_BULLET;
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