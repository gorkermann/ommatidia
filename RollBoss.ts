import { Chrono, Anim, AnimField, AnimFrame, MilliCountdown } from './lib/juego/Anim.js'
import { Entity, cullList } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Material } from './lib/juego/Material.js'  
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Dict } from './lib/juego/util.js'

import { Boss, BossState } from './Boss.js'
import { CenteredEntity } from './CenteredEntity.js'
import { COL } from './collisionGroup.js'
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
	dir: Vec2;
	flashMaterial = new Material( 0, 0, 0.2 );
	health = gunHealth;

	constructor( pos: Vec2=new Vec2( 0, 0 ) ) {
		super( pos, 40, 10 );

		this.angle = -Math.PI / 4;

		this.dir = this.pos.unit();

		this.material = new Material( 60, 0.8, 0.5 );
	}

	fire(): Entity {
		return new Bullet( 
				this.pos.copy(), 
				this.dir.turned( this.angle ).scale( 5 ) );
	}

	getShapes( step: number ): Array<Shape> {
		let shapes = super.getShapes( step );

		// make the short edges black
		shapes[0].edges[1].material = this.flashMaterial;
		shapes[0].edges[3].material = this.flashMaterial;
		return shapes;
	}
}

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
	tops: Array<CenteredEntity> = []; // 225deg
	bottoms: Array<CenteredEntity> = []; // 45deg
	rollerLength: number = 60;

	guns: Array<Gun> = [];

	gutter: Gutter;

	/* behavior */

	state: State = BossState.DEFAULT;

	health: number = 20;
	maxHealth: number; // set in constructor

	invuln: boolean = false;
	fireGun: boolean = true;

	shiftRollers: boolean = false;
	
	flash: number = 0;

	counts: Dict<Chrono> = {
		'fire': new Chrono( 0, 1000 ),
		'lockOn': new Chrono( 10000, 10000 ),
		'explode': new Chrono( 0, 500 ),
	}

	angleVelBase = 0.02;
	angleVelFactor = 1.2;

	extension: number = 0;
	
	anim = new Anim( {
		'angleVel': new AnimField( this, 'angleVel', 0.001 ),
		'extension': new AnimField( this, 'extension', 2 ),
		'fireGun': new AnimField( this, 'fireGun' ),
		'invuln': new AnimField( this, 'invuln' ),
		'fireInt': new AnimField( this.counts['fire'], 'interval', 1000 ) // high rate
	},
	new AnimFrame( {
		'angleVel': { value: this.angleVelBase },
		'extension': { value: 0 },
		'fireGun': { value: true },
		'invuln': { value: false },
		'fireInt': { value: 1000 },
	} ) );

	triggers: Array<Trigger> = [];
	triggerSet: Array<boolean> = [];

	oldSin = 0;

	/* property overrides */

	angleVel = this.angleVelBase;

	material = new Material( 60, 1.0, 0.5 );

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	discardFields: Array<string> = this.discardFields.concat(
		['material', 'altMaterial'] ).concat(

		['rollerLength', 'coreMaterial', 'triggers'] );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false, doInit: boolean=true ) {
		super( pos, 40, 40 );

		this.angle = Math.PI / 4;

		// guns
		this.guns.push( new Gun( new Vec2( -this.width / 1.41, 0 ) ) );
		this.guns.push( new Gun( new Vec2( this.width / 1.41, 0 ) ) );

		this.guns.map( x => this.addSub( x ) );

		// rollers
		for ( let i = 0; i < 3; i++ ) {
			let top = new CenteredEntity( 
				new Vec2( 0, -this.height / 2 - this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			top.angle = -Math.PI / 4;
			top.material = new Material( 0, 1.0, 0.5 );
			top.altMaterial = new Material( 0, 1.0, 0.3 );
			this.addSub( top );
			this.tops.push( top );

			let bottom = new CenteredEntity( 
				new Vec2( 0, this.height / 2 + this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			bottom.angle = -Math.PI / 4;
			bottom.material = new Material( 0, 1.0, 0.5 );
			bottom.altMaterial = new Material( 0, 1.0, 0.3 );
			this.addSub( bottom );
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
			() => this.guns.filter( x => x.health > 0 ).length == 0,
			() => {
				this.shiftRollers = true;
				this.increaseSpeed();
				this.anim.clear();
			},
			'RollBoss: no guns left'
		) );

		while ( this.triggerSet.length < this.triggers.length ) {
			this.triggerSet.push( false );
		}
	}

	getSubs(): Array<CenteredEntity> {
		return this.tops
			   .concat( this.bottoms )
			   .concat( this.guns.filter( x => x.health > 0 ) )
			   .concat( [this.gutter].filter( () => this.health > 0 ) );
	}

	increaseSpeed() {
		( this.anim.stack[0].targets['angleVel'].value as number ) *= this.angleVelFactor;
	}

	getOwnShapes(): Array<Shape> {
		let shapes = super.getOwnShapes();

		if ( this.guns.filter( x => x.health > 0 ).length > 0 ) {
			let shell = Shape.makeRectangle(
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

			shell.material = this.material;
			shell.parent = this;

			shapes.push( shell );
		}

		return shapes;
	}

	getHealth(): number {
		return Math.max( this.health, 0 ) +
			   Math.max( this.guns[0].health, 0 ) + 
			   Math.max( this.guns[1].health, 0 ); 
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

				// check which side the bullet hit on
				let vec = new Vec2( -1, 1 ).rotate( this.angle ); // direction of gun 1
				let gunCount = this.guns.filter( x => x.health > 0 ).length;
				let dir = otherEntity.pos.minus( this.pos );

				if ( gunCount > 0 ) {
					if ( vec.dot( dir ) > 0 && this.guns[0].health > 0 ) {
						this.guns[0].health -= 1;
						this.flash = 5;
					} else if ( vec.dot( dir ) < 0 && this.guns[1].health > 0 ) {
						this.guns[1].health -= 1;
						this.flash = 5;
					}

				} else {
					this.health -= 1;
					this.flash = 5;
				}

				if ( this.health <= 0 ) {
					this.state = BossState.EXPLODE;
				}

				console.log( 'RollBoss status: ' + this.health + ' ' + this.guns[0].health + ' ' + this.guns[1].health );
			}
		}
	}

	update( step: number, elapsed: number ) {
		if ( this.state == BossState.EXPLODE ) {
			this.explodeUpdate( step, elapsed );
		} else {
			this.defaultUpdate( step, elapsed );
		}

		for ( let key in this.counts ) {
			if ( this.counts[key].count > 0 ) {
				this.counts[key].count -= elapsed;
			}
		}
	}

	defaultUpdate( step: number, elapsed: number ) {
		this.advance( step );
		//this.pos.add( this.vel.times( step ) );
		//this.angle += this.angleVel * step;

		this.anim.update( step, elapsed );
		//this.angleVel = this.angleVel_ctrl.update( step, this.angleVel, elapsed );
		//this.extension = this.extension_ctrl.update( step, this.extension, elapsed );

		/*let cleaned;
		do {
			cleaned = false;

			cleaned ||= this.angleVel_ctrl.cleanStack();
			cleaned ||= this.extension_ctrl.cleanStack();
		} while ( cleaned );*/

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
			let sin = Math.sin( this.angle - Math.PI / 4 );
			let cos = Math.cos( this.angle - Math.PI / 4 );

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

		this.gutter.angle = -this.angle;

		for ( let sub of this.getSubs() ) {
			/*sub.angle = this.angle + sub.relAngle;
			sub.pos = sub.relPos.turned( this.angle + sub.relAngle);
			sub.pos.add( this.pos );

			sub.angleVel = this.angleVel;*/

			if ( sub instanceof Gun ) {
				if ( this.fireGun ) {
					let dir = sub.pos.unit().rotate( sub.angle );
					let cross = dir.cross( this.watchTarget.unit() );

					if ( dir.dot( this.watchTarget.unit() ) > 0.9 && 
						 cross * this.angleVel > 0 && 
						 this.counts['lockOn'].count <= 0 ) {
						this.anim.pushFrame( new AnimFrame( {
							'angleVel': {
								value: 0.01 * ( this.angleVel < 0 ? -1 : 1 ), 
								expireOnCount: 5000
							},
							'fireInt': {
								value: 750
							}
						} ) );

						this.counts['lockOn'].reset();
					}

					sub.flashMaterial.lum = this.counts['fire'].count / this.counts['fire'].interval;
					if ( sub.flashMaterial.lum > 1.0 ) sub.flashMaterial.lum = 1.0;

					if ( this.counts['fire'].count <= 0 ) {
						//for ( let spread = 0; spread < 3; spread++ ) {
							let bullet = sub.fire();
							bullet.vel.rotate( 0.5 * Math.random() - 0.25 );

							this.spawnEntity( bullet );

							bullet.collisionGroup = COL.ENEMY_BULLET;
							bullet.collisionMask = 0x00;
						//}
					}
				}
			}
		}

		if ( this.counts['fire'].count <= 0 ) {
			this.counts['fire'].reset();
		}

		this.gutter.angleVel = 0.0;

		// flash when hit
		let skew = 0;

		if ( this.flash > 0 ) {
			skew = Math.sin( this.flash / 10 * Math.PI ) / 2;

			this.flash -= 1 * step;
		}

		this.material.skewL = skew;
		for ( let sub of this.getSubs() ) {
			sub.material.skewL = skew / ( sub.pos.length() / 100 + 1 );
			if ( sub.altMaterial ) sub.altMaterial.skewL = skew;
		}
	}

	explodeUpdate( step: number, elapsed: number ) {
		if ( this.counts['explode'].count <= 0 ) {
			let ents = this.getSubs().concat( [this] );
			let i = Math.floor( Math.random() * ents.length );

			let p = ( ents[i] as CenteredEntity ).getRandomPoint();

			this.spawnEntity( new Explosion( p ) );

			this.alpha -= 0.1;
		
			if ( this.alpha <= 0 ) {
				document.dispatchEvent( new CustomEvent( "complete", {} ) );
			}

			this.counts['explode'].reset();
		}
	}
}