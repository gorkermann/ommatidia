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
import { Boss, BossState, BossFlags } from './Boss.js'

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
		'fireflies',
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

			this.spawnEntity( new Explosion( this.pos.copy() ) );
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

class Firefly extends Bullet {
	watchTarget: Vec2;
	boundary: number = 50;
	speed: number = 5;
	active: boolean = false;

	material = new Material( 45, 0.2, 0.5 );

	/* property overrides */

	anim = new Anim( {
		'vel': new AnimField( this, 'vel', this.speed ),
		'matS': new AnimField( this.material, 'sat', 0.2 )
	} );

	constructor( pos: Vec2 ) {
		super( pos, new Vec2( 0, 0 ) );
	}

	updateVel() {
		this.vel = this.watchTarget.unit().times( this.speed );
	}

	/* Entity overrides */

	update() {
		if ( !this.active && this.watchTarget && this.watchTarget.length() < this.boundary ) {
			this.anim.pushFrame( new AnimFrame( {}, [
				new FuncCall<typeof this.updateVel>( this, 'updateVel', [] )
			] ) );

			this.anim.pushFrame( new AnimFrame( { 
				'matS': { value: 1.0 }
			} ) );

			this.anim.pushFrame( new AnimFrame( { 
				'matS': { value: 0.2 }
			} ) );

			this.anim.pushFrame( new AnimFrame( { 
				'matS': { value: 1.0 }
			} ) );

			this.active = true;
		}
	}

	watch( target: Vec2 ) {
		this.watchTarget = target.minus( this.pos );
	}
}

class Mosquito extends Bullet {
	watchTarget: Vec2;
	radius: number = 50;
	speed: number = 3;

	relAngle: number = 0;
	relAngleVel: number = this.speed / ( this.radius * 2 * Math.PI );

	shellLeft: CenteredEntity;
	shellRight: CenteredEntity;

	/* property overrides */

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', this.speed ), // high speed to maintain seek position
		'relAngle': new AnimField( this, 'relAngle', 0.1 ),
		'matS': new AnimField( this.material, 'sat', 0.2 ),
		'hue': new AnimField( this.material, 'hue', 3 ),

		// thread 1
		'angle': new PhysField( this, 'angle', 'angleVel', 0.2 ), // not pointing, so doesn't need isAngle
	} );

	constructor( pos: Vec2, relAngle: number, count: number ) {
		super( pos, new Vec2( 0, 0 ) );

		// shell
		let shellW = this.width + 4;
		this.shellLeft = new CenteredEntity( new Vec2( -shellW / 4, 0 ), shellW / 2, shellW );
		this.shellLeft.material = new Material( 75, 1.0, 0.5 );
		this.shellRight = new CenteredEntity( new Vec2( shellW / 4, 0 ), shellW / 2, shellW );
		this.shellRight.material = new Material( 75, 1.0, 0.5 );

		this.anim.fields['l-pos'] = new PhysField( this.shellLeft, 'pos', 'vel', 2 );
		this.anim.fields['l-alpha'] = new AnimField( this.shellLeft.material, 'alpha', 0.1 );

		this.anim.fields['r-pos'] = new PhysField( this.shellRight, 'pos', 'vel', 2 );
		this.anim.fields['r-alpha'] = new AnimField( this.shellRight.material, 'alpha', 0.1 );

		this.addSub( this.shellLeft );
		this.addSub( this.shellRight );

		// self
		this.relAngle = relAngle;

		// animation
		this.anim.pushFrame( new AnimFrame( {}, [
			// TODO: alpha shape control
			new FuncCall<typeof this.fire>( this, 'fire', [] )
		] ) );

		this.anim.pushFrame( new AnimFrame( {
			//'hue': { value: 45 },
			'l-pos': { value: new Vec2( -shellW * 2, 0 ) }, // 11 frames (shellW / 4 = 3, shellW * 2 = 24, speed = 2)
			'l-alpha': { value: 0.0 }, // 10 frames 
			'r-pos': { value: new Vec2( shellW * 2, 0 ) },
			'r-alpha': { value: 0.0 },
		} ) );

		this.anim.pushFrame( new AnimFrame( {
			'relAngle': { value: this.relAngleVel, overrideDelta: true, expireOnCount: count },
			'alpha': { value: 1.0 },
		}, [
			{ caller: this, funcName: 'orbit', eachUpdate: true }
		] ) );

		this.anim.pushFrame( new AnimFrame( {
			'angle': { value: 0.2, overrideDelta: true, expireOnCount: count }
		} ), { threadIndex: 1 } );
	}

	/* Entity overrides */

	watch( target: Vec2 ) {
		this.watchTarget = target.minus( this.pos );
	}

	/* Unique methods */

	orbit() {
		if ( this.watchTarget ) {
			this.relAngle += this.relAngleVel;

			let dest = this.watchTarget.plus( this.pos ).plus( Vec2.fromPolar( this.relAngle, this.radius ) );

			this.pos.set( dest );
		}
	}

	fire() {
		this.anim.pushFrame( new AnimFrame( {
			'pos': { value: this.pos.plus( this.watchTarget.unit().times( 1000 ) ) } // far away
		} ) );
	}
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

	fireflies: Array<Bullet> = [];

	/* property overrides */

	attacks = attacks;
	overrideAttackField = 'SHELL_ATK';

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

	/**
	 * Rings are open from -15 to +15 degrees, so rotation to player angle means an opening faces the player
	 */
	pushWatchFrame() {
		this.anim.clear( { withTag: 'watch' } );

		this.anim.pushFrame( new AnimFrame( {
			'ring0-angle': { value: this.watchTarget.angle() },
		} ), { tag: 'watch', threadIndex: 2 } );
	}

	/**
	 * 
	 * 
	 * @return {AnimFrame} [description]
	 */
	getAlignFrame(): AnimFrame {
		let slice = Math.PI / 3; // 60 degrees

		let diff = ( this.watchTarget.angle() - this.rings[0].angle ) % slice;
		if ( diff < 0 ) diff += slice; // mod can be negative in js
		if ( diff > slice / 2 ) diff = diff - slice;
		let closest = this.rings[0].angle + diff;

		return new AnimFrame( {
			'ring0-angle': { value: closest },
		} );
	}

	/* Entity overrides */

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( this.invuln ) return;

			this.health -= 1;

			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.0, overrideRate: 0.1 },
			} ), { threadIndex: 1, tag: 'exit' } );
			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.5 },
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
 
	canEnter( attack: Attack ): boolean {
		if ( attack.name == 'open_charge' ) return true;
		if ( attack.name == 'closed_charge' ) return true;
		if ( attack.name == 'fireflies' ) return false;

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
				/*
					idea: position self and decoys in a fan shape opposite the player

					let positions = [new Vec2( 0, -1 ), new Vec2( -0.866, -0.5 ), new Vec2( -0.866, 0.5 ), new Vec2( 0, 1 )]
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
					'alpha': { value: 1 },
					'ring0-radius': { value: new Vec2( this.rings[0].radius, 0 ) },
					'ring0-wall0-angle': { value: slice * 3.5 },
					'ring0-wall1-angle': { value: slice * 4.5 },
					'ring0-wall2-angle': { value: slice * 5.5 },
					'ring0-wall3-angle': { value: slice * -5.5 },
					'ring0-wall4-angle': { value: slice * -4.5 },
					'ring0-wall5-angle': { value: slice * -3.5 },

					'ring1-alpha': { value: 0 },
					
					'ring2-alpha': { value: 0 },
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
					'ring1-alpha': { value: 1 },
					'ring2-alpha': { value: 1 },
				} ) );

				// reposition decoys (rings 1 and 2)
				this.anim.pushFrame( new AnimFrame( {
					'ring1-pos': { value: positions[1], overrideRate: 0 },
					'ring1-radius': { value: new Vec2( this.rings[1].closedRadius, 0 ), overrideRate: 0 },
					'ring1-angle': { value: angles[1], overrideRate: 0 },

					'ring2-pos': { value: positions[2], overrideRate: 0 },
					'ring2-radius': { value: new Vec2( this.rings[2].closedRadius, 0 ), overrideRate: 0 },
					'ring2-angle': { value: angles[2], overrideRate: 0 },
				} ) );

			} else if ( this.attack.name == 'fireflies' ) {
				for ( let firefly of this.fireflies ) {
					firefly.removeThis = true;
				}

				let positions: Array<Vec2> = [];

				// let spacing = 100;

				// let w = 600 / spacing;
				// let h = 600 / spacing;

				// for ( let x = 0; x < w; x++ ) {
				// 	for ( let y = 0; y < h; y++ ) {
				// 		positions.push( new Vec2( x * spacing, y *))
				// 	}
				// }

				let total = 3;
				let skip = Math.floor( Math.random() * total );
				for ( let i = 0; i < total; i++ ) {
					//if ( i == skip ) continue;

					let angle = i * Math.PI * 2 / total;
					let position = this.watchTarget.plus( this.pos ).plus( Vec2.fromPolar( angle, 50 ) );

					let bullet = new Mosquito( position, angle, 4000 + i * 1000 );
					this.fireflies.push( bullet );

					this.spawnEntity( bullet );
					bullet.collisionGroup = COL.ENEMY_BULLET;
				}

				this.anim.pushFrame( new AnimFrame( {
					'wait': { value: 0, expireOnCount: 10000 }
				} ) );
			}
		}

		/* update attack */

		cullList( this.fireflies );
	}
}

export let constructors: Dict<Newable> = { 
	'ShellBossBarrier': ShellBossBarrier,
	'ShellBossRing': ShellBossRing,
	'ShellBossMissile': ShellBossMissile,
	'ShellBoss': ShellBoss
}