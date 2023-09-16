import { Chrono, Anim, AnimField, AnimFrame, MilliCountdown } from './lib/juego/Anim.js'
import { Entity, cullList } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Material } from './lib/juego/Material.js'  
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Dict, discreteAccelDist } from './lib/juego/util.js'

import { Boss, BossState } from './Boss.js'
import { CenteredEntity } from './CenteredEntity.js'
import { COL, MILLIS_PER_FRAME } from './collisionGroup.js'
import { Explosion } from './Explosion.js'
import { Bullet, Gutter } from './Bullet.js'

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

let gunHealth = 20;

export class Gun extends CenteredEntity {
	flashMaterial = new Material( 0, 0, 0.2 );
	health = gunHealth;

	constructor( pos: Vec2=new Vec2( 0, 0 ), angle: number ) {
		super( pos, 40, 10 );

		this.angle = angle;

		this.material = new Material( 60, 0.8, 0.5 );
	}

	getDir(): Vec2 {
		return this.applyTransform( new Vec2( 1, 0 ), 0.0, { angleOnly: true } );
	}

	fire(): Entity {
		return new Bullet( 
			this.applyTransform( this.pos.copy() ), 
			this.getDir().scale( 5 ) );
	}

	getOwnShapes(): Array<Shape> {
		let shapes = super.getOwnShapes();

		// make the short edges black
		shapes[0].edges[1].material = this.flashMaterial;
		shapes[0].edges[3].material = this.flashMaterial;

		shapes[0].points[1].scale( 2 );

		let shell = Shape.fromPoints( [
			new Vec2( 0, 0 ),
			new Vec2( -this.pos.x, 40 ),
			new Vec2( -this.pos.x, -40 ) ] );

		shell.material = this.material;
		shell.parent = this;

		shapes.push( shell );

		return shapes;
	}
}

// four more guns on middle rollers

// center gun beam attack
// center guns fly off and run around on the edge of the arena,
// do beam attack between them (strafe left/right or top down)
// player must hide between the rollers to avoid it (rollers are aligned with beam dir)

class Trigger {
	condition: () => boolean;
	action: () => void;
	desc: string;

	constructor( condition: () => boolean, action: () => void, desc: string='trigger set' ) {
		this.condition = condition;
		this.action = action;
		this.desc = desc;
	}

	update(): boolean {
		let set = false;

		if ( this.condition() ) {
			this.action();
			set = true;

			console.log( this.desc );
		}

		return set;
	}
}

enum RollBossState {
	STATE1 = BossState.EXPLODE + 1
}

type State = BossState | RollBossState;

export class RollBoss extends Boss {
	axis = new CenteredEntity( new Vec2( 0, 0 ), 0, 0 );

	tops: Array<CenteredEntity> = []; // 225deg
	bottoms: Array<CenteredEntity> = []; // 45deg
	rollerLength: number = 60;

	guns: Array<Gun> = [];

	gutter: Gutter;

	/* behavior */

	state: State = BossState.DEFAULT;

	invuln: boolean = false;
	fireGun: boolean = true;

	shiftRollers: boolean = false;
	
	flash: number = 0;

	angleVelBase = 0.02;
	angleVelFactor = 1.2;

	extension: number = 0;

	triggers: Array<Trigger> = [];
	triggerSet: Array<boolean> = [];

	oldSin = 0;

	tracking: boolean = false;

	/* property overrides */

	health = 20;

	material = new Material( 60, 1.0, 0.5 );

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	counts: Dict<Chrono> = { ...this.counts,
		'fire': new Chrono( 0, 1000 ),
		'lockOn': new Chrono( 10000, 10000 ),
	}

	anim = new Anim( {
		'angleVel': new AnimField( this.axis, 'angleVel', 0.0005 ),
		'extension': new AnimField( this, 'extension', 1 ),
		'fireGun': new AnimField( this, 'fireGun' ),
		'invuln': new AnimField( this, 'invuln' ),
		'fireInt': new AnimField( this.counts['fire'], 'interval', 1000 ),
		'tracking': new AnimField( this, 'tracking' )
	},
	new AnimFrame( {
		'angleVel': { value: 0 },
		'extension': { value: 0 },
		'fireGun': { value: true },
		'invuln': { value: false },
		'fireInt': { value: 1000 },
		'tracking': { value: false }
	} ) );

	discardFields: Array<string> = this.discardFields.concat(
		['material', 'altMaterial'] ).concat(
		['rollerLength', 'coreMaterial', 'triggers'] );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false, doInit: boolean=true ) {
		super( pos, 40, 40 );

		// add a buffer entity so the eye doesn't rotate
		this.axis.angle = Math.PI / 2;
		this.axis.isGhost = true;
		this.addSub( this.axis );

		// guns
		this.guns.push( new Gun( new Vec2( this.width / 1.41, 0 ), 0 ) );
		this.guns.push( new Gun( new Vec2( this.width / 1.41, 0 ), Math.PI ) );

		this.guns.map( x => this.axis.addSub( x ) );

		// rollers
		for ( let i = 0; i < 3; i++ ) {
			let top = new CenteredEntity( 
				new Vec2( 0, -this.height / 2 - this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			top.material = new Material( 0, 1.0, 0.5 );
			top.altMaterial = new Material( 0, 1.0, 0.3 );
			top.collisionGroup = COL.ENEMY_BODY;
			top.collisionMask = COL.PLAYER_BULLET;
			this.axis.addSub( top );
			this.tops.push( top );

			let bottom = new CenteredEntity( 
				new Vec2( 0, this.height / 2 + this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			bottom.material = new Material( 0, 1.0, 0.5 );
			bottom.altMaterial = new Material( 0, 1.0, 0.3 );
			bottom.collisionGroup = COL.ENEMY_BODY;
			bottom.collisionMask = COL.PLAYER_BULLET;
			this.axis.addSub( bottom );
			this.bottoms.push( bottom );
		}

		// gutter
		this.gutter = new Gutter( new Vec2( 0, -150 ), 10, 300 );
		this.gutter.collisionGroup = COL.ENEMY_BULLET;
		this.gutter.collisionMask = 0x00;
		this.addSub( this.gutter );

		if ( spawn ) {
			this.spawnEntity( new Barrier( this.pos.copy(), 640 ) );
		}

		this.maxHealth = this.getHealth();

		if ( doInit ) {
			this.init();
		}
	}

	init() {

		/* behavior */ 

		let gunFunc = () => {
			if ( this.anim.stack[0].targets['extension'].value == 0 ) {

				this.increaseSpeed();
				this.anim.clear();
				this.anim.pushFrame( new AnimFrame( {
					'extension': { value: this.rollerLength, expireOnReach: true, setDefault: true },
					'angleVel': { value: 0 },
					'fireGun': { value: false },
					'invuln': { value: true }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'fireGun': { value: false },
					'invuln': { value: true, expireOnCount: 2000 }
				} ) );

			} else {
				this.increaseSpeed();
			}
		}

		for ( let gun of this.guns ) {
			this.triggers.push( new Trigger( 
				() => gun.health <= gunHealth / 2,
				gunFunc,
				'RollBoss: gun health reduced to half'
			) );

			this.triggers.push( new Trigger( 
				() => gun.health <= 0,
				() => { 
					this.increaseSpeed();
					//this.counts['fire'].interval *= 0.5;
				},
				'RollBoss: gun health reduced to 0'
			) );
		}

		this.triggers.push( new Trigger(
			() => this.extension == this.rollerLength,
			() => {
				this.counts['lockOn'].reset();
			},
			'RollBoss: extended arms',
		) );

		this.triggers.push( new Trigger(
			() => this.guns.length < 2,
			() => {
				this.shiftRollers = true;
				this.increaseSpeed();
				this.anim.clear();
			},
			'RollBoss: core exposed'
		) );

		while ( this.triggerSet.length < this.triggers.length ) {
			this.triggerSet.push( false );
		}
	}

	cull() {
		cullList( this.guns );

		super.cull();
	}

	getBody(): Array<CenteredEntity> {
		return ( [this] as Array<CenteredEntity> )
			   .concat( this.tops )
			   .concat( this.bottoms )
			   .concat( this.guns );
	}

	increaseSpeed() {
		let speed = this.anim.stack[0].targets['angleVel'].value as number;
		if ( speed == 0 ) speed = this.angleVelBase;

		( this.anim.stack[0].targets['angleVel'].value as number ) = speed * this.angleVelFactor;
	}

	getHealth(): number {
		let health = Math.max( this.health, 0 );

		this.guns.map( x => health += Math.max( x.health, 0 ) );

		return health;
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			let hit = true;

			if ( contact.sub && contact.sub instanceof CenteredEntity ) {
				if ( this.tops.includes( contact.sub ) || 
					 this.bottoms.includes( contact.sub ) ) {
					hit = false;
				}
			}

			if( this.invuln ) {
				hit = false;
			}

			if ( hit ) {

				let gunCount = this.guns.length;
				let gunHit = false;

				for ( let gun of this.guns ) {

					// check which side the bullet hit on
					let pos = gun.applyTransform( new Vec2() );
					let dot = contact.point.minus( this.pos ).dot( pos.minus( this.pos ) );
					
					// debug {
						let context = ( window as any ).context;

						context.fillStyle = 'black';
						context.fillRect( contact.point.x, contact.point.y, 4, 4 );
						context.fillStyle = 'red';
						context.fillRect( this.pos.x, this.pos.y, 4, 4 );
						context.fillStyle = 'blue';
						context.fillRect( pos.x, pos.y, 4, 4 );
					//}

					if ( dot > 0 ) {
						gun.health -= 1;
						this.flash = 5;
						gunHit = true;
					}

					if ( gun.health <= 0 ) {
						gun.destructor();
					}
				}

				if ( !gunHit ) {
					this.health -= 1;
					this.flash = 5;

					this.doEyeStrain();
				}

				if ( this.health <= 0 ) {
					this.doEyeDead();
					this.state = BossState.EXPLODE;
				}

				let str = 'RollBoss state: ' + this.health;
				for ( let gun of this.guns ) {
					str += ' ' + gun.health;
				}

				console.log( str );
			}
		}
	}

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed );

		this.anim.update( step, elapsed );
	}

	defaultLogic( step: number, elapsed: number ) {
		for ( let i = 0; i < this.triggers.length; i++ ) {
			if ( !this.triggerSet[i] ) {
				this.triggerSet[i] = this.triggers[i].update();	
			}
		}

		// sub-entities
		if ( !this.shiftRollers ) {
			for ( let i = 1; i < this.tops.length; i++ ) {
				this.tops[i].pos.y = this.tops[i-1].pos.y - this.rollerLength - this.extension;
			}

			for ( let i = 1; i < this.bottoms.length; i++ ) {
				this.bottoms[i].pos.y = this.bottoms[i-1].pos.y + this.rollerLength + this.extension;
			}

		} else if ( this.watchTarget ) {
			let sin = Math.sin( this.axis.angle );
			let cos = Math.cos( this.axis.angle );

			let dist = this.watchTarget.length() - this.height / 2;
			if ( dist < 0 ) dist = 0;

			let bin = Math.floor( dist / this.rollerLength );

			let shift = [0, 0, 0]; // o---

			if ( bin == 2 ) { // o- - - 
				shift[1] = 1;
				shift[2] = 1;
			
			} else if ( bin == 3 ) { // o- --
				shift[1] = 1;
				shift[2] = 0;
			
			} else if ( bin == 4 ) { // o-  --
				shift[1] = 2;
				shift[2] = 0;
			}

			// top rollers are pointing up
			if ( sin * this.oldSin < 0 && cos > 0 ) {
				//this.tops[0].pos.y = -this.height / 2 - this.rollerLength * 1.5; 

				for ( let i = 1; i < this.tops.length; i++ ) {
					this.tops[i].pos.y = this.tops[i-1].pos.y - 
						this.rollerLength * ( 1 + shift[i] );
				}
			}

			// bottom rollers are pointing up
			if ( sin * this.oldSin < 0 && cos < 0 ) {
				//this.bottoms[0].pos.y = this.height / 2 + this.rollerLength * 1.5; 

				for ( let i = 1; i < this.bottoms.length; i++ ) {
					this.bottoms[i].pos.y = this.bottoms[i-1].pos.y +
						this.rollerLength * ( 1 + shift[i] );
				}
			}

			this.oldSin = sin;
		}

		for ( let gun of this.guns ) {
			if ( this.fireGun ) {
				let dir = gun.getDir();
				let cross = dir.cross( this.watchTarget.unit() );

				if ( this.counts['lockOn'].count <= 0 ) {
					let lockVel = 0.01;
					let decel = 0.005;
					let stopAngle = discreteAccelDist( this.axis.angleVel, decel, 0 );
					let watchCos = dir.dot( this.watchTarget.unit() );
					let lockTime = 5000;
					let sweepAngle = lockTime / MILLIS_PER_FRAME * lockVel;

					if ( !this.tracking && 
						 this.guns.length > 1 &&
						 watchCos > Math.cos( stopAngle + sweepAngle / 2 ) && 
						 cross * this.axis.angleVel > 0 ) {

						this.anim.pushFrame( new AnimFrame( {
							'angleVel': {
								value: lockVel * ( this.axis.angleVel < 0 ? -1 : 1 ), 
								overrideRate: decel, // decelerate quickly
								expireOnCount: 5000
							},
							'fireInt': { value: 750 },
							'tracking': { value: true }
						} ) );

						this.counts['lockOn'].reset();
					}
				}

				gun.flashMaterial.lum = this.counts['fire'].count / this.counts['fire'].interval;
				if ( gun.flashMaterial.lum > 1.0 ) gun.flashMaterial.lum = 1.0;

				if ( this.counts['fire'].count <= 0 ) {
					//for ( let spread = 0; spread < 3; spread++ ) {
						let bullet = gun.fire();
						bullet.vel.rotate( 0.5 * Math.random() - 0.25 );

						this.spawnEntity( bullet );

						bullet.collisionGroup = COL.ENEMY_BULLET;
						bullet.collisionMask = 0x00;
					//}

					if ( !this.tracking &&
						 this.guns.length == 1 ) {

						this.anim.pushFrame( new AnimFrame( {
							'angleVel': {
								value: ( this.anim.stack[0].targets['angleVel'].value as number ) * ( cross < 0 ? -1 : 1 ),
								overrideRate: 0.005,
								expireOnCount: 1000
							},
							'tracking': { value: true }
						} ) );
					}
				}
			}
		}

		if ( this.counts['fire'].count <= 0 ) {
			this.counts['fire'].reset();
		}

		// flash when hit
		let skew = 0;

		if ( this.flash > 0 ) {
			skew = Math.sin( this.flash / 10 * Math.PI ) / 2;

			this.flash -= 1 * step;
		}

		this.material.skewL = skew;
		for ( let sub of this.getBody() ) {
			sub.material.skewL = skew / ( sub.pos.length() / 100 + 1 );
			if ( sub.altMaterial ) sub.altMaterial.skewL = skew;
		}
	}
}