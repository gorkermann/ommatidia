import { Anim, AnimField, PhysField, AnimFrame, AnimTarget } from '../lib/juego/Anim.js'
import { Angle } from '../lib/juego/Angle.js'
import { Newable } from '../lib/juego/constructors.js'
import { Entity, cullList, TransformOrder } from '../lib/juego/Entity.js'
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
import { Boss, BossState } from './Boss.js'

let fieldWidth = 600;
let interiorWidth = 200;
let wallUnit = 20;

let attacks = [
	new Attack(
		'open_charge',
		[]
	),
	new Attack(
		'closed_charge',
		[]
	),
	new Attack(
		'tornado',
		[ {'allOf': ['lalala'] } ]
	),
	new Attack(
		'chambers',
		[ {'allOf': ['lalala'] } ]
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

	/* Entity overrides */

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

class ShellBossMissile extends CenteredEntity {
	watchTarget: Vec2 = null;

	speed: number = 5;

	health: number = 5;
	invuln: boolean = false;
	flash: number = 0.0;
	alpha: number = 1.0;

	oldAngle: number;
	angleFuel: number = Math.PI * 2;

	/* property overrides */

	anim = new Anim( {
		//'pos': new PhysField( this, 'pos', 'vel', 2 ),
		'angle': new PhysField( this, 'angle', 'angleVel', 0.1, { isAngle: true } ),
		'flash': new AnimField( this, 'flash', 0.1 ),
		'alpha': new AnimField( this, 'alpha', 0.2 ),
		'invuln': new AnimField( this, 'invuln' )
	},
	new AnimFrame( {
		'flash': { value: 0.0 }
	} ) );

	material = new Material( 110, 1.0, 0.9 );

	collisionMask = COL.PLAYER_BODY | COL.PLAYER_BULLET | COL.ENEMY_BODY | COL.LEVEL;

	constructor( pos: Vec2, angle: number ) {
		super( pos, 20, 8 );

		this.angle = angle;
		this.oldAngle = angle;

		let tip = new CenteredEntity( new Vec2( 10, 0 ), 6, 6 );
		tip.material = new Material( 45, 1.0, 0.5 );
		this.addSub( tip );
	}

	/* Entity overrides */

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;
			if ( this.invuln ) return;

			this.health -= 1;

			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.0 }
			} ), { threadIndex: 1 } )

			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.5, overrideRate: 0 }
			} ), { threadIndex: 1 } )
		
		} else {
			if ( this.invuln ) return;

			this.health = 0;
		}

		if ( this.health <= 0 && this.alpha == 1 ) {
			this.anim.clear();

			this.angleVel = 0;
			this.vel.set( new Vec2( 0, 0 ) );

			this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 0.0 }
			} ) )
		}
	}

	update() {
		if ( this.alpha == 1 ) {
			if ( this.watchTarget && this.anim.isDone() && this.angleFuel > 0 ) {
				this.anim.pushFrame( new AnimFrame( {
					'angle': { value: this.watchTarget.angle(), expireOnCount: 100 }
				} ) );
			}

			this.vel = Vec2.fromPolar( this.angle, this.speed );

		} else if ( this.alpha <= 0 ) {
			this.removeThis = true;
		}

		let diff = Math.abs( Angle.normalize( this.angle - this.oldAngle ) );
		this.angleFuel -= diff;
		this.oldAngle = this.angle;
	}

	shade() {
		this.material.skewL = this.flash;
		this.material.alpha = this.alpha;

		for ( let sub of this.getSubs() ) {
			sub.material.skewL = this.flash;
			sub.material.alpha = this.alpha;
		}
	}

	/* CenteredEntity overrides */

	watch( target: Vec2 ) {
		this.watchTarget = target.minus( this.pos );
	}
}

class ShellBossRing extends CenteredEntity {
	closedRadius: number = wallUnit / Math.tan( Math.PI * 2 / 6 / 2 );
	radius: number = 100 - wallUnit / 2;

	alpha: number = 1.0;

	radiusVec = new Vec2( this.closedRadius, 0 );
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
		super( pos, wallUnit, wallUnit );

		let wallCount = 6;

		for ( let i = 0; i < wallCount; i++ ) {
			let sub = new CenteredEntity( this.radiusVec, wallUnit, wallUnit * 2 ); // position is shared by all subs
			sub.vel = this.radiusVel;

			sub.angle = ( i + 0.5 ) * Math.PI * 2 / wallCount; // angle = 0 is open
			sub.material = this.material;
			sub.altMaterial = this.altMaterial;
			sub.noAdvance = true;

			this.addSub( sub );
			this.walls.push( sub );
		}
	}

	/* Entity overrides */

	getShapes( step: number=1.0 ): Array<Shape> {
		if ( this.alpha == 0 ) return [];

		else return super.getShapes( step );
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
	retreating: boolean
}

export class ShellBoss extends Boss {
	rings: Array<ShellBossRing> = [];

	flash: number = 0.0;

	flags: BossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false
	};

	center: Vec2;

	wait: number = 0;

	/* property overrides */

	flavorName = 'SHELL CORE';

	health = 40;

	material = new Material( 60, 1.0, 0.5 );

	collisionGroup = COL.ENEMY_BODY;
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

		this.center = this.pos.copy();
		this.flags['health'] = this.getHealth();

		for ( let i = 0; i < 4; i++ ) {
			let ring = new ShellBossRing( this.pos.copy() );
			this.anim.fields['ring' + i + '-pos'] = new PhysField( ring, 'pos', 'vel', 2 );
			this.anim.fields['ring' + i + '-angle'] = new PhysField( ring, 'angle', 'angleVel', 0.04, { isAngle: true } );
			this.anim.fields['ring' + i + '-radius'] = new PhysField( ring.walls[0], 'pos', 'vel', 6 );
			this.anim.fields['ring' + i + '-alpha'] = new AnimField( ring, 'alpha', 0.05 );
			ring.alpha = 0;

			this.rings.push( ring );
		}

		this.rings[0].alpha = 1;

		for ( let i = 0; i < this.rings[0].walls.length; i++ ) {
			this.anim.fields['ring0-wall' + i + '-angle'] = new PhysField( this.rings[0].walls[i], 'angle', 'angleVel', 0.1, { isAngle: true }  );
		}

		if ( spawn ) {
			let barrier = new ShellBossBarrier( this.center.copy(), fieldWidth );
			this.spawnEntity( barrier );
			barrier.collisionGroup = COL.LEVEL;

			for ( let ring of this.rings ) {
				this.spawnEntity( ring );

				ring.collisionMask = COL.PLAYER_BULLET | COL.ENEMY_BULLET;
			}
		}
	}

	shootMissile( angle: number ) {
		let missile = new ShellBossMissile( this.pos.copy(), angle );
		missile.invuln = true;

		let time = this.rings[0].radius * 1.5 / missile.speed * MILLIS_PER_FRAME;

		missile.anim.pushFrame( new AnimFrame( {
			'invuln': { value: false }
		} ) );

		missile.anim.pushFrame( new AnimFrame( {
			'angle': { value: missile.angle, expireOnCount: time }
		} ) );

 		this.spawnEntity( missile );
		missile.collisionGroup = COL.ENEMY_BULLET;
		missile.collisionMask = COL.PLAYER_BODY | COL.PLAYER_BULLET | COL.ENEMY_BODY | COL.LEVEL;
	}

	spreadShot( count: number, spread: number, offset: number=0 ) {
		let halfSpread = ( count - 1 ) / 2;

		for ( let i = 0; i < count; i++ ) {
			let angle = this.rings[0].angle + offset;

			if ( count > 1 ) {
				angle += ( -halfSpread + i ) / ( count - 1 ) * spread;
			}

			let bullet = new Bullet( this.pos.copy(), Vec2.fromPolar( angle, 10 ) );

			this.spawnEntity( bullet );
			bullet.collisionGroup = COL.ENEMY_BULLET;
		}
	}

	pushFollowFrame() {
		this.anim.clear( { withTag: 'follow' } );

		let pos = this.watchTarget.plus( this.pos );

		this.anim.pushFrame( new AnimFrame( {
			'pos': { value: pos, expireOnReach: true },
			'ring0-pos': { value: pos, expireOnReach: true },
		} ), { tag: 'follow', threadIndex: 3 } );
	}

	pushWatchFrame() {
		this.anim.clear( { withTag: 'watch' } );

		this.anim.pushFrame( new AnimFrame( {
			'ring0-angle': { value: this.watchTarget.angle(), expireOnReach: true },
		} ), { tag: 'watch', threadIndex: 2 } );
	}

	pushAlignFrame( threadIndex: number=2 ) {
		this.anim.clear( { withTag: 'watch' } );

		let slice = Math.PI / 3;

		let diff = ( this.watchTarget.angle() - this.rings[0].angle ) % slice;
		if ( diff > slice / 2 ) diff = diff - slice;
		let closest = this.rings[0].angle + diff;

		this.anim.pushFrame( new AnimFrame( {
			'ring0-angle': { value: closest, expireOnReach: true },
		} ), { tag: 'watch', threadIndex: threadIndex } );
	}

	getAlignFrame(): AnimFrame {
		let slice = Math.PI / 3;

		let diff = ( this.watchTarget.angle() - this.rings[0].angle ) % slice;
		if ( diff > slice / 2 ) diff = diff - slice;
		let closest = this.rings[0].angle + diff;

		return new AnimFrame( {
			'ring0-angle': { value: closest, expireOnReach: true },
		} );
	}

	/* Entity overrides */

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

				this.anim.clear();
			}
		}
	}

	/* Boss overrides */

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}

	defaultLogic() {
		let present: Array<string> = [];

		let health = this.getHealth();
		if ( health < this.flags['health'] ) {
			this.flags['current_attack_damage'] += this.flags['health'] - health;
			this.flags['health'] = health;
		}

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
			this.flags['retreating'] = false;

			let start = Math.PI / 2;
			this.anim.clear( { withoutTag: 'exit' } );

			// open_charge
			if ( this.attack.name == 'open_charge' ) {
				let watchAngle = this.watchTarget.plus( this.pos ).sub( this.pos ).angle();

				// close
				this.anim.pushFrame( new AnimFrame( {
					'ring0-radius': { value: new Vec2( this.rings[0].closedRadius, 0 ) },
				} ), { tag: 'exit' } );

				// spin, wait
				this.anim.pushFrame( new AnimFrame( {
					'ring0-angle': { value: 0.01, overrideDelta: true, expireOnCount: 8000 },
				} ) );

				// shoot missiles, wait
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnCount: 2000 },
				}, [
					new FuncCall<typeof this.shootMissile>( this, 'shootMissile', [watchAngle - Math.PI / 3] ),
					new FuncCall<typeof this.shootMissile>( this, 'shootMissile', [watchAngle + Math.PI / 3] ),
					//new FuncCall<typeof this.shootMissile>( this, 'shootMissile', [watchAngle - Math.PI * 2 / 3] ),
					//new FuncCall<typeof this.shootMissile>( this, 'shootMissile', [watchAngle + Math.PI * 2 / 3] ),
				] ) );

				// open and align
				let frame = this.getAlignFrame();
				frame.targets['ring0-radius'] = new AnimTarget( new Vec2( this.rings[0].radius ) );
				this.anim.pushFrame( frame );

			} else if ( this.attack.name == 'closed_charge' ) {
				/*let positions = [new Vec2( 0, -1 ), new Vec2( -0.866, -0.5 ), new Vec2( -0.866, 0.5 ), new Vec2( 0, 1 )]
								.map( x => x.rotate( this.watchTarget.angle() )
											.times( fieldWidth / 2 * 0.5 )
											.plus( this.center ) );

				let newIndex = Math.floor( Math.random() * positions.length );

				positions.unshift( positions.splice( newIndex, 1 )[0] );

				let r = this.rings[0].radius;
				//let newPos = Vec2.fromPolar( Math.random() * Math.PI * 2, r + Math.random() * ( fieldWidth / 2 - r * 2 ) )
				//			.plus( this.center );
				let newPos = positions[0];*/

				let watchPos = this.watchTarget.plus( this.pos );
				let newPos: Vec2;
 				let r = this.rings[0].closedRadius + wallUnit / 2;
 				let count = 0;

 				let positions = [this.pos.copy()];
 				let angles = [this.angle];
 				let overlap = false;

 				for ( let i = 0; i < 2; i++ ) {
					do {
						count++;

						if ( count > 10 ) {
							console.error( 'ShellBoss open_charge: Unable to find valid initial position' );
							break;
						}

						newPos = Vec2.fromPolar( Math.random() * -Math.PI, Math.random() * ( fieldWidth / 2 - this.rings[0].radius ) )
										.plus( this.center );

						overlap = newPos.distTo( watchPos ) < r;
						for ( let position of positions ) {
							overlap = overlap || newPos.distTo( position ) < r * 2;
						}

					} while ( overlap );

					positions.push( newPos );
					angles.push( watchPos.minus( newPos ).angle() );
				}

				let watchAngle = this.watchTarget.plus( this.pos ).sub( newPos ).angle();
				let slice = Math.PI * 2 / 12;

				// close
				this.anim.pushFrame( new AnimFrame( {
					'ring0-radius': { value: new Vec2( this.rings[0].closedRadius, 0 ) },
					'ring0-wall0-angle': { value: slice * 1 },
					'ring0-wall1-angle': { value: slice * 3 },
					'ring0-wall2-angle': { value: slice * 5 },
					'ring0-wall3-angle': { value: slice * 7 },
					'ring0-wall4-angle': { value: slice * 9 },
					'ring0-wall5-angle': { value: slice * 11 },
				} ) );

				// shoot
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnCount: 500 }
				}, [
					new FuncCall<typeof this.spreadShot>( this, 'spreadShot', [7, 1.4] )
				] ) );

				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnCount: 1000 }
				}, [
					new FuncCall<typeof this.spreadShot>( this, 'spreadShot', [7, 1.4] ),
					{ caller: this, funcName: 'pushWatchFrame', eachUpdate: true }
				] ) );

				// open, disappear decoys
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnReach: true },
					'ring0-radius': { value: new Vec2( this.rings[0].radius, 0 ) },
					'ring0-wall0-angle': { value: slice * 3.5, expireOnReach: true },
					'ring0-wall1-angle': { value: slice * 4.5, expireOnReach: true },
					'ring0-wall2-angle': { value: slice * 5.5, expireOnReach: true },
					'ring0-wall3-angle': { value: slice * -5.5, expireOnReach: true },
					'ring0-wall4-angle': { value: slice * -4.5, expireOnReach: true },
					'ring0-wall5-angle': { value: slice * -3.5, expireOnReach: true },

					'ring1-alpha': { value: 0, expireOnReach: true },
					
					'ring2-alpha': { value: 0, expireOnReach: true },
				}, [{ caller: this, funcName: 'pushWatchFrame', eachUpdate: true }] ) );

				// swap with one of the decoys
				let indices = [0, 1, 2];
				let index = Math.floor( Math.random() * ( positions.length - 1 ) ) + 1;
				let temp = indices[0];
				indices[0] = indices[index];
				indices[index] = temp;

				this.anim.pushFrame( new AnimFrame( {
					'pos': { value: positions[indices[0]], overrideRate: 0 },
					'ring0-pos': { value: positions[indices[0]], overrideRate: 0 },
					'ring0-angle': { value: angles[indices[0]], overrideRate: 0 },
					
					'ring1-pos': { value: positions[indices[1]], overrideRate: 0 },
					'ring1-angle': { value: angles[indices[1]], overrideRate: 0 },

					'ring2-pos': { value: positions[indices[2]], overrideRate: 0 },
					'ring2-angle': { value: angles[indices[2]], overrideRate: 0 },
				} ) );

				// appear decoys
				this.anim.pushFrame( new AnimFrame( {
					'ring1-alpha': { value: 1, expireOnReach: true },
					'ring2-alpha': { value: 1, expireOnReach: true },
				} ) );

				// reposition
				this.anim.pushFrame( new AnimFrame( {
					'ring1-pos': { value: positions[1], overrideRate: 0 },
					'ring1-radius': { value: new Vec2( this.rings[1].closedRadius, 0 ), overrideRate: 0 },
					'ring1-angle': { value: angles[1], overrideRate: 0 },

					'ring2-pos': { value: positions[2], overrideRate: 0 },
					'ring2-radius': { value: new Vec2( this.rings[2].closedRadius, 0 ), overrideRate: 0 },
					'ring2-angle': { value: angles[2], overrideRate: 0 },
				} ) );

			} else if ( this.attack.name == 'tornado' ) {
				let slice = Math.PI * 2 / 12;
				let newPos = this.center.copy();

				// fade in, spin, wait
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1, expireOnCount: 100000 },

					'ring0-angle': { value: 0.01, overrideDelta: true },
					'ring1-angle': { value: -0.02, overrideDelta: true },
					'ring2-angle': { value: 0.03, overrideDelta: true },
					'ring3-angle': { value: -0.04, overrideDelta: true },
				} ) );

				// fade in, expand
				this.anim.pushFrame( new AnimFrame( {
					'ring1-alpha': { value: 1 },
					'ring2-alpha': { value: 1 },
					'ring3-alpha': { value: 1 },

					'ring0-radius': { value: new Vec2( this.rings[0].radius, 0 ) },
					'ring1-radius': { value: new Vec2( this.rings[0].radius + wallUnit * 3, 0 ) },
					'ring2-radius': { value: new Vec2( this.rings[0].radius + wallUnit * 6, 0 ) },
					'ring3-radius': { value: new Vec2( this.rings[0].radius + wallUnit * 9, 0 ) },
				} ) );

				// reposition
				this.anim.pushFrame( new AnimFrame( {
					//'pos': { value: newPos.copy(), overrideRate: 0  },
					//'ring0-pos': { value: newPos.copy(), overrideRate: 0 },
					//'ring0-radius': { value: new Vec2( this.rings[0].radius - wallUnit * 0, 0 ), overrideRate: 0 },
					//'ring0-angle': { value: Math.random() * Math.PI * 2, overrideRate: 0 },
					//'ring0-wall0-angle': { value: slice * 0, overrideRate: 0 },
					// 'ring0-wall1-angle': { value: slice * 2, overrideRate: 0 },
					// 'ring0-wall2-angle': { value: slice * 4, overrideRate: 0 },
					// 'ring0-wall3-angle': { value: slice * 6, overrideRate: 0 },
					// 'ring0-wall4-angle': { value: slice * 8, overrideRate: 0 },
					// 'ring0-wall5-angle': { value: slice * 10, overrideRate: 0 },

					'ring1-pos': { value: this.pos.copy(), overrideRate: 0 },
					'ring1-radius': { value: new Vec2( this.rings[0].closedRadius, 0 ), overrideRate: 0 },
					'ring1-angle': { value: Math.random() * Math.PI * 2, overrideRate: 0 },

					'ring2-pos': { value: this.pos.copy(), overrideRate: 0 },
					'ring2-radius': { value: new Vec2( this.rings[0].closedRadius, 0 ), overrideRate: 0 },
					'ring2-angle': { value: Math.random() * Math.PI * 2, overrideRate: 0 },

					'ring3-pos': { value: this.pos.copy(), overrideRate: 0 },
					'ring3-radius': { value: new Vec2( this.rings[0].closedRadius, 0 ), overrideRate: 0 },
					'ring3-angle': { value: Math.random() * Math.PI * 2, overrideRate: 0 }
				} ) );

				/*// fade out everything
				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 0  },
					'ring0-alpha': { value: 0 },
					'ring1-alpha': { value: 0 },
					'ring2-alpha': { value: 0 },
					'ring3-alpha': { value: 0 },
				} ) );*/

			} else if ( this.attack.name == 'chambers' ) {
				let slice = Math.PI * 2 / 12;
				let watchPos = this.watchTarget.plus( this.pos );

				// close
				this.anim.pushFrame( new AnimFrame( {
					'ring0-radius': { value: new Vec2( 0, 0 ), overrideRate: 1 },
					'ring0-alpha': { value: 1 },
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'alpha': { value: 1 },
				} ) );

				// reposition
				this.anim.pushFrame( new AnimFrame( {
					'pos': { value: this.center.copy(), overrideRate: 0  },
					'ring0-pos': { value: watchPos, overrideRate: 0 },
					'ring0-radius': { value: new Vec2( this.rings[0].radius + wallUnit * 2, 0 ), overrideRate: 0 },
					'ring0-wall0-angle': { value: slice * 0, overrideRate: 0 },
					'ring0-wall1-angle': { value: slice * 2, overrideRate: 0 },
					'ring0-wall2-angle': { value: slice * 4, overrideRate: 0 },
					'ring0-wall3-angle': { value: slice * 6, overrideRate: 0 },
					'ring0-wall4-angle': { value: slice * 8, overrideRate: 0 },
					'ring0-wall5-angle': { value: slice * 10, overrideRate: 0 },
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

		if ( this.attack ) {
			if ( this.attack.name == 'chambers' && this.alpha == 1 ) {
				let pos = this.watchTarget.plus( this.pos ).sub( this.rings[0].pos );
				if ( pos.length() > this.rings[0].radiusVec.length() ) {
					this.anim.clear();

					// fade out everything
					this.anim.pushFrame( new AnimFrame( {
						'alpha': { value: 0  },
						'ring0-alpha': { value: 0 },
						'ring1-alpha': { value: 0 },
						'ring2-alpha': { value: 0 },
						'ring3-alpha': { value: 0 },
					} ) );
				}

			} else if ( this.attack.name == 'tornado' ) {
				if ( this.flags['current_attack_damage'] > 0 && !this.flags['retreating'] ) {
					this.flags['retreating'] = true;

					this.anim.clear(); // (stop spin)

					// close outside
					this.anim.pushFrame( new AnimFrame( {
						'ring3-radius': { value: new Vec2( this.rings[3].closedRadius, 0 ) },
						'ring2-radius': { value: new Vec2( this.rings[2].closedRadius, 0 ) },
						'ring1-radius': { value: new Vec2( this.rings[1].closedRadius, 0 ) },
						'ring0-radius': { value: new Vec2( this.rings[0].closedRadius, 0 ) },
					} ) );
				}

				if ( this.flags['retreating'] ) {
					let pos = this.watchTarget.plus( this.pos ).minus( this.rings[3].pos );

					if ( pos.length() > this.rings[3].radiusVec.length() ) {
						this.anim.clear();

						// fade out outers
						this.anim.pushFrame( new AnimFrame( {
							'ring1-alpha': { value: 0 },
							'ring2-alpha': { value: 0 },
							'ring3-alpha': { value: 0 },
						} ) );
					}
				}
			}
		}
	}
}

export let constructors: Dict<Newable> = { 
	'ShellBossBarrier': ShellBossBarrier,
	'ShellBossRing': ShellBossRing,
	'ShellBossMissile': ShellBossMissile,
	'ShellBoss': ShellBoss
}