import { Anim, AnimField, PhysField, AnimFrame, AnimTarget, MilliCountdown, SpinDir } from '../lib/juego/Anim.js'
import { Newable } from '../lib/juego/constructors.js'
import { Entity, cullList, TransformOrder } from '../lib/juego/Entity.js'
import { Range } from '../lib/juego/Editable.js'
import { Contact } from '../lib/juego/Contact.js'
import { Material } from '../lib/juego/Material.js'  
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { Dict } from '../lib/juego/util.js'

import { CenteredEntity } from '../CenteredEntity.js'
import { COL } from '../collisionGroup.js'
import { Explosion } from '../Explosion.js'
import { Bullet, Gutter } from '../Bullet.js'

import * as Debug from '../Debug.js'

import { Attack, AttackReq } from './Attack.js'
import { Boss, BossState } from './Boss.js'

let fieldWidth = 600;
let interiorWidth = 200;
let hallWidth = fieldWidth - interiorWidth * 2;
let wallUnit = 20;
let trackWidth = interiorWidth + hallWidth; // track is a line going down the center of the hall

let attacks = [
	new Attack(
		'open_charge',
		[]
	),
	new Attack(
		'closed_charge',
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
Debug.fields['SHELL_ATK'].default = attackNames.join( ',' );
Debug.validators['SHELL_ATK'] = Debug.arrayOfStrings( attackNames );

/*function getSegmentedRect( width: number, height: number, segLength: number ): Shape {
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
	shape.points.map( x => x.add( new Vec2( -width / 2, -height / 2 ) ) );

	return shape;
}*/

export class ShellBossBarrier extends CenteredEntity {
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

class ShellBossRing extends CenteredEntity {
	radius: number = hallWidth / 2 - wallUnit / 2;

	alpha: number = 1.0;

	radiusVec = new Vec2( this.radius, 0 );
	radiusVel = new Vec2();

	walls: Array<Entity> = [];

	/* property overrides */

	isGhost = true;

	material = new Material( 90, 1.0, 0.3 );
	altMaterial = new Material( 90, 1.0, 0.5 );

	editFields: Array<string> = this.editFields.concat( 
		['angleVel'] );

	ranges: Dict<Range> = Object.assign( this.ranges, {
		'angleVel': 'real'
	} );

	constructor( pos: Vec2 ) {
		super( pos, hallWidth, hallWidth );

		let wallCount = 6;

		for ( let i = 0; i < wallCount; i++ ) {
			let sub = new CenteredEntity( this.radiusVec, wallUnit, wallUnit * 2 ); // position is shared by all subs
			sub.vel = this.radiusVel;

			sub.angle = i * Math.PI * 2 / wallCount;
			sub.material = this.material;
			sub.altMaterial = this.altMaterial;
			sub.noAdvance = true;

			this.addSub( sub );
			this.walls.push( sub );
		}
	}

	advance( step: number ) {
		super.advance( step );

		this.radiusVec.add( this.radiusVel );
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;
		}
	}

	shade() {
		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		super.shade();
	}
}

type BossFlags = {
	health: number
	current_attack_damage: number
}

class FuncCall<Func extends ( this: any, ...args: any ) => any> { // TS doesn't check that Func has the correct this value, so leaving it as any
	caller: any;
	funcName: string;
	args: Parameters<Func>;

	constructor( caller: any, funcName: string, args: Parameters<Func> ) {
		this.caller = caller;
		this.funcName = funcName;
		this.args = args;
	}
}

export class ShellBoss extends Boss {
	rings: Array<ShellBossRing> = [];

	flash: number = 0.0;

	travelDir: SpinDir = SpinDir.CW;
	trackPos: Vec2 = new Vec2( 0, interiorWidth / 2 + hallWidth / 2 );

	waypoints: Array<Vec2> = [];

	flags: BossFlags = {
		health: 0,
		current_attack_damage: 0
	};

	doFire: boolean = false;

	center: Vec2;
	parking = new Vec2( fieldWidth * 2, 0 );

	/* property overrides */

	flavorName = 'SHELL CORE';

	health = 80;

	material = new Material( 60, 1.0, 0.5 );

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', 2 ),
		'alpha': new AnimField( this, 'alpha', 0.05 ),
		'flash': new AnimField( this, 'flash' ),
		'invuln': new AnimField( this, 'invuln' ),
		'state': new AnimField( this, 'state' ),
		'doFire': new AnimField( this, 'doFire' ),
	},
	new AnimFrame( {
		'flash': { value: 0.0 },
		'invuln': { value: false },
	} ) );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		this.center = this.pos.copy();

		this.waypoints.push( this.pos.plus( new Vec2( -1, -1 ).scale( trackWidth ) ) );
		this.waypoints.push( this.pos.plus( new Vec2( 1, -1 ).scale( trackWidth ) ) );
		this.waypoints.push( this.pos.plus( new Vec2( 1, 1 ).scale( trackWidth ) ) );
		this.waypoints.push( this.pos.plus( new Vec2( -1, 1 ).scale( trackWidth ) ) );

		for ( let i = 0; i < 4; i++ ) {
			let ring = new ShellBossRing( this.pos.copy() );
			this.anim.fields['ring' + i + '-pos'] = new PhysField( ring, 'pos', 'vel', 2 );
			this.anim.fields['ring' + i + '-angle'] = new PhysField( ring, 'angle', 'angleVel', 0.04, { isAngle: true } );
			this.anim.fields['ring' + i + '-radius'] = new PhysField( ring, 'radiusVec', 'radiusVel', 20 );
			this.anim.fields['ring' + i + '-alpha'] = new AnimField( ring, 'alpha', 0.05 );
			ring.alpha = 0;

			this.rings.push( ring );
		}

		for ( let i = 0; i < this.rings[0].walls.length; i++ ) {
			this.anim.fields['ring0-wall' + i + '-angle'] = new PhysField( this.rings[0].walls[i], 'angle', 'angleVel', 0.1, { isAngle: true }  );
		}

		if ( spawn ) {
			this.spawnEntity( 
				new ShellBossBarrier( 
					this.center.copy(), fieldWidth ) );

			for ( let ring of this.rings ) {
				this.spawnEntity( ring );

				ring.collisionMask = COL.PLAYER_BULLET | COL.ENEMY_BULLET;
			}
		}
	}

	/* function overrides */

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}

	defaultLogic() {
		let present: Array<string> = [];

		if ( this.anim.isDone( [0] ) ) {
			if ( Debug.flags.FORCE_BOSS_ATK ) {
				let names = Debug.fields.SHELL_ATK.value.split( ',' );
				let debugAttacks = attacks.filter( x => names.includes( x.name ) );

				if ( debugAttacks.length > 0 ) {
					let index = Math.floor( Math.random() * debugAttacks.length )
					this.attack = debugAttacks[index];

				} else {
					console.warn( 'ShellBoss.defaultLogic: no valid attacks from debug' );
				}

			} else if ( !this.attack ) {
				this.attack = getAttack( 'open_charge' );

			} else if ( this.counter ) {
				this.attack = this.counter;
				this.counter = null;

			} else {
				let possibleAttacks = attacks.filter( x => x.canEnter( present ) );

				if ( this.attack && possibleAttacks.length > 1 ) {
					possibleAttacks = possibleAttacks.filter( x => x != this.attack );
				}

				if ( possibleAttacks.length == 0 ) {
					this.messages.push( 'The SHELL CORE surrenders!\n' );
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

			// open_charge
			if ( this.attack.name == 'open_charge' ) {
				this.anim.pushFrame( new AnimFrame( {
					'ring0-radius': { value: new Vec2( fieldWidth, 0 ) }
				} ) );

				// more spinning, boss fades out
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 0, expireOnReach: true },
					'ring0-angle': { value: 0.1, overrideDelta: true }
				} ) );	

				// fade in ring
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnReach: true },
					'ring0-alpha': { value: 1, expireOnReach: true },
					'ring0-angle': { value: 0.1, overrideDelta: true }
				} ) );				

				let r = this.rings[0].radius;
				let pos = Vec2.fromPolar( Math.random() * Math.PI * 2, r + Math.random() * ( fieldWidth / 2 - r * 2 ) )
							.plus( this.center );

				// reposition
				this.anim.pushFrame( new AnimFrame( {
					'pos': { value: pos, overrideRate: 0  },
					'ring0-pos': { value: pos, overrideRate: 0 },
					'ring0-radius': { value: new Vec2( this.rings[0].radius, 0 ), overrideRate: 0 },
					'ring1-pos': { value: this.parking.copy(), overrideRate: 0 },
					'ring2-pos': { value: this.parking.copy(), overrideRate: 0 },
					'ring3-pos': { value: this.parking.copy(), overrideRate: 0 },
				} ) );

				// fade out everything
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 0  },
					'ring0-alpha': { value: 0 },
					'ring1-alpha': { value: 0 },
					'ring2-alpha': { value: 0 },
					'ring3-alpha': { value: 0 },
				} ) );

			} else if ( this.attack.name == 'closed_charge' ) {
				let r = this.rings[0].radius;
				let newPos = Vec2.fromPolar( Math.random() * Math.PI * 2, r + Math.random() * ( fieldWidth / 2 - r * 2 ) )
							.plus( this.center );

				let watchAngle = this.watchTarget.plus( this.pos ).sub( newPos ).angle();
				let slice = Math.PI * 2 / 12;

				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnCount: 1000 } // wait
				} ) );

				this.anim.pushFrame( new AnimFrame( {}, [
					new FuncCall<typeof this.spreadShot>( this, 'spreadShot', [3, 3] )
				] ) );

				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnCount: 500 } // wait
				}, [
					{ caller: this, funcName: 'spreadShot', args: [7, 1.4] }
				] ) );

				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnReach: true },
					'ring0-alpha': { value: 1, expireOnReach: true },
					'ring0-wall0-angle': { value: slice * 3.5, expireOnReach: true },
					'ring0-wall1-angle': { value: slice * 4.5, expireOnReach: true },
					'ring0-wall2-angle': { value: slice * 5.5, expireOnReach: true },
					'ring0-wall3-angle': { value: slice * -5.5, expireOnReach: true },
					'ring0-wall4-angle': { value: slice * -4.5, expireOnReach: true },
					'ring0-wall5-angle': { value: slice * -3.5, expireOnReach: true },
				}, [{ caller: this, funcName: 'pushWatchFrame', eachUpdate: true }] ) );

				// reposition
				this.anim.pushFrame( new AnimFrame( {
					'pos': { value: newPos.copy(), overrideRate: 0  },
					'ring0-pos': { value: newPos.copy(), overrideRate: 0 },
					'ring0-radius': { value: new Vec2( this.rings[0].radius, 0 ), overrideRate: 0 },
					'ring0-angle': { value: watchAngle, overrideRate: 0 },
					'ring0-wall0-angle': { value: slice * 1, overrideRate: 0 },
					'ring0-wall1-angle': { value: slice * 3, overrideRate: 0 },
					'ring0-wall2-angle': { value: slice * 5, overrideRate: 0 },
					'ring0-wall3-angle': { value: slice * 7, overrideRate: 0 },
					'ring0-wall4-angle': { value: slice * 9, overrideRate: 0 },
					'ring0-wall5-angle': { value: slice * 11, overrideRate: 0 },	
					'ring1-pos': { value: this.parking.copy(), overrideRate: 0 },
					'ring2-pos': { value: this.parking.copy(), overrideRate: 0 },
					'ring3-pos': { value: this.parking.copy(), overrideRate: 0 },
				} ) );

				// fade out everything
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 0  },
					'ring0-alpha': { value: 0 },
					'ring1-alpha': { value: 0 },
					'ring2-alpha': { value: 0 },
					'ring3-alpha': { value: 0 },
				} ) );
			}
		}

		/*if ( this.attack ) {
			if ( this.attack.name == 'open_charge' ) {
				if ( this.anim.isDone( [1] ) ) {
					for ( let i = 0; i < 6; i++ ) {
						let angle = ( i + 0.5 ) / 6 * Math.PI * 2 + this.ring.angle;
						let bullet = new Bullet( this.pos.copy(), Vec2.fromPolar( angle, 5 ) );

						this.spawnEntity( bullet );
						bullet.collisionGroup = COL.ENEMY_BULLET;
					}

					this.anim.pushFrame( new AnimFrame( {
						'doFire': { value: false, expireOnCount: 2000 }
					} ), { threadIndex: 1 } )
				}
			}
		}*/
	}

	spreadShot( count: number, spread: number ) {
		let halfSpread = ( count - 1 ) / 2;

		for ( let i = 0; i < count; i++ ) {
			let angle = ( -halfSpread + i ) / ( count - 1 ) * spread + this.rings[0].angle;
			let bullet = new Bullet( this.pos.copy(), Vec2.fromPolar( angle, 10 ) );

			this.spawnEntity( bullet );
			bullet.collisionGroup = COL.ENEMY_BULLET;
		}
	}

	pushWatchFrame() {
		this.anim.clear( { withTag: 'watch' } );

		this.anim.pushFrame( new AnimFrame( {
			'ring0-angle': { value: this.watchTarget.angle(), expireOnReach: true },
		} ), { tag: 'watch', threadIndex: 2 } );
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( this.invuln ) return;

			this.health -= 1;

			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.0, expireOnReach: true, overrideRate: 0.1 },
			} ), { threadIndex: 1, tag: 'exit' } );
			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.5, expireOnReach: true },
			} ), { threadIndex: 1 } );

			/*this.hitSound.count = 1;
			this.hitSound.audio.currentTime = 0.0;
			this.anim.pushFrame( new AnimFrame ( {}, [
				{ caller: this, funcName: 'addSound', args: [this.hitSound] },
			] ), { threadIndex: 1 } );*/

			this.doEyeStrain();

			if ( this.health <= 0 ) {
				this.doEyeDead();
				this.state = BossState.EXPLODE;
			}
		}
	}
}

export let constructors: Dict<Newable> = { 
	'ShellBossBarrier': ShellBossBarrier,
	'ShellBossRing': ShellBossRing,
	'ShellBoss': ShellBoss
}