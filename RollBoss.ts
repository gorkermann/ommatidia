import { Entity } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Material } from './lib/juego/Material.js'  
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

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

		let quarterLen = Math.floor( shape.edges.length / 4 );

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

	constructor( relPos: Vec2=new Vec2( 0, 0 ) ) {
		super( new Vec2(), 40, 10 );

		this.relPos = relPos;
		this.relAngle = -Math.PI / 4;

		this.dir = this.relPos.unit();

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

export class Target {
	target: number;
	rate: number;

	constructor( target: number, rate: number ) {
		this.target = target;
		this.rate = Math.abs( rate );
	}

	update( step: number, value: number ): number {
		if ( Math.abs( value - this.target ) <= this.rate * step ) {
			value = this.target;

		} else if ( value < this.target ) {
			value += this.rate * step;

		} else { // value > this.target
			value -= this.rate * step;
		}

		return value;
	}
}

let RollBossState = {
	DEFAULT: 0,
	EXPLODE: 1,
}

export class RollBoss extends CenteredEntity {
	tops: Array<CenteredEntity> = []; // 225deg
	bottoms: Array<CenteredEntity> = []; // 45deg
	rollerLength: number = 60;

	guns: Array<Gun> = [];

	coreMaterial = new Material( 30, 1.0, 0.5 );

	gutter: Gutter;

	/* behavior */

	state: number = RollBossState.DEFAULT;

	health: number = 20;
	alpha: number = 1.0;

	invuln: boolean = false;
	fireGun: boolean = true;

	shiftRollers: boolean = false;
	
	startTime: number = 0;
	flash: number = 0;
	fireInterval: number = 1000;

	angleVelBase = 0.02;
	angleVelTarget = new Target( this.angleVelBase, 0.001 );
	angleVelFactor = 1.2;

	extension: number = 0;
	extensionTarget = new Target( 0, 2 );
	
	triggers: Array<Trigger> = [];
	triggerSet: Array<boolean> = [];

	watchTarget: Vec2 = null;

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

		// rollers
		for ( let i = 0; i < 3; i++ ) {
			let top = new CenteredEntity( 
					new Vec2( 0, -this.height / 2 - this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			top.relPos = top.pos.copy();
			top.relAngle = -Math.PI / 4;
			top.material = new Material( 0, 1.0, 0.5 );
			top.altMaterial = new Material( 0, 1.0, 0.3 );
			this.tops.push( top );

			let bottom = new CenteredEntity( 
					new Vec2( 0, this.height / 2 + this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			bottom.relPos = bottom.pos.copy();
			bottom.relAngle = -Math.PI / 4;
			bottom.material = new Material( 0, 1.0, 0.5 );
			bottom.altMaterial = new Material( 0, 1.0, 0.3 );
			this.bottoms.push( bottom );
		}

		// gutter
		this.gutter = new Gutter( new Vec2( 0, -150 ), 10, 300 );
		this.gutter.collisionGroup = COL.ENEMY_BULLET;
		this.gutter.collisionMask = 0x00;

		if ( spawn ) {
			this.spawnEntity( new Barrier( this.pos.copy(), 600 ) );
		}

		if ( doInit ) {
			this.init();
		}
	}

	init() {

		/* behavior */ 

		let gunFunc = () => {
			if ( this.extensionTarget.target == 0 ) {
				this.extensionTarget.target = this.rollerLength;
				this.angleVelTarget.target = 0;
				this.fireGun = false;
				this.invuln = true;
			} else {
				this.angleVelTarget.target *= -this.angleVelFactor
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
					this.angleVelTarget.target *= this.angleVelFactor;
					this.fireInterval *= 0.5;
				},
				'RollBoss: gun health reduced to 0'
			) );
		}

		this.triggers.push( new Trigger(
			() => this.extension == this.rollerLength,
			() => {
				this.angleVelTarget.target = this.angleVelBase * -this.angleVelFactor;
				this.fireGun = true;
				this.invuln = false;
			},
			'RollBoss: extended arms',
		) );

		this.triggers.push( new Trigger(
			() => this.guns.filter( x => x.health > 0 ).length == 0,
			() => this.shiftRollers = true,
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

	getOwnShapes(): Array<Shape> {
		let shapes = [];

		let core = Shape.makeCircle( new Vec2( 0, 0 ), 39, 9 );
		core.material = this.coreMaterial;
		core.parent = this;

		let altM = new Material( 0, 1.0, 0.7 );
		for ( let i = 1; i < core.edges.length; i += 2 ) {
		//	core.edges[i].material = altM;
		}

		shapes.push( core );

		if ( this.guns.filter( x => x.health > 0 ).length > 0 ) {
			let shell = Shape.makeRectangle(
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

			shell.material = this.material;
			shell.parent = this;

			shapes.push( shell );
		}

		return shapes;
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
					} else if ( this.guns[1].health > 0 ) {
						this.guns[1].health -= 1;
						this.flash = 5;
					}

				} else {
					this.health -= 1;
					this.flash = 5;
				}

				if ( this.health <= 0 ) {
					this.state = RollBossState.EXPLODE;
				}

				console.log( 'RollBoss status: ' + this.health + ' ' + this.guns[0].health + ' ' + this.guns[1].health );
			}
		}
	}

	watch( target: Vec2 ) {
		this.watchTarget = target.copy();
	}

	update( step: number ) {
		if ( this.state == RollBossState.EXPLODE ) {
			this.explodeUpdate( step );
		} else {
			this.defaultUpdate( step );
		}
	}

	defaultUpdate( step: number ) {
		this.pos.add( this.vel.times( step ) );
		this.angle += this.angleVel * step;

		this.angleVel = this.angleVelTarget.update( step, this.angleVel );
		this.extension = this.extensionTarget.update( step, this.extension );

		if ( !this.shiftRollers ) {
			for ( let i = 1; i < this.tops.length; i++ ) {
				this.tops[i].relPos.y = this.tops[i-1].relPos.y - this.rollerLength - this.extension;
			}

			for ( let i = 1; i < this.bottoms.length; i++ ) {
				this.bottoms[i].relPos.y = this.bottoms[i-1].relPos.y + this.rollerLength + this.extension;
			}

		} else if ( this.watchTarget ) {
			let sin = Math.sin( this.angle - Math.PI / 4 );
			let cos = Math.cos( this.angle - Math.PI / 4 );

			let dist = this.pos.distTo( this.watchTarget ) - this.height / 2;
			if ( dist < 0 ) dist = 0;

			let bin = Math.floor( dist / this.rollerLength );

			let shift = [0, 0, 0]; // default is bins 0, 2, and 4

			if ( bin == 2 ) {
				shift[1] = 1;
				shift[2] = 1;
			
			} else if ( bin == 3 ) {
				shift[1] = 1;
				shift[2] = 0;
			
			} else if ( bin == 4 ) {
				shift[1] = 2;
				shift[2] = 0;
			}

			// top rollers are pointing up
			if ( sin * this.oldSin < 0 && cos > 0 ) {
				//this.tops[0].relPos.y = -this.height / 2 - this.rollerLength * 1.5; 

				for ( let i = 1; i < this.tops.length; i++ ) {
					this.tops[i].relPos.y = this.tops[i-1].relPos.y - 
						this.rollerLength * ( 1 + shift[i] );
				}

				//this.angleVelTarget.target = -this.angleVel;
			}

			// bottom rollers are pointing up
			if ( sin * this.oldSin < 0 && cos < 0 ) {
				//this.bottoms[0].relPos.y = this.height / 2 + this.rollerLength * 1.5; 

				for ( let i = 1; i < this.bottoms.length; i++ ) {
					this.bottoms[i].relPos.y = this.bottoms[i-1].relPos.y +
						this.rollerLength * ( 1 + shift[i] );
				}

				//this.angleVelTarget.target = -this.angleVel;
			}

			this.oldSin = sin;
		}

		// sub-entities
		let now = new Date().getTime();

		this.gutter.relAngle = -this.angle;

		for ( let sub of this.getSubs() ) {
			sub.angle = this.angle + sub.relAngle;
			sub.pos = sub.relPos.turned( this.angle + sub.relAngle);
			sub.pos.add( this.pos );

			sub.angleVel = this.angleVel;

			if ( sub instanceof Gun && this.fireGun ) {
				sub.flashMaterial.lum = ( now - this.startTime ) / this.fireInterval;
				if ( sub.flashMaterial.lum > 1.0 ) sub.flashMaterial.lum = 1.0;

				if ( now - this.startTime > this.fireInterval ) {
					//for ( let spread = 0; spread < 3; spread++ ) {
						let bullet = sub.fire();
						//bullet.vel.rotate( -0.15 + 0.15 * spread );

						this.spawnEntity( bullet );

						bullet.collisionGroup = COL.ENEMY_BULLET;
						bullet.collisionMask = 0x00;
					//}
				}
			}
		}

		this.gutter.angleVel = 0.0;

		if ( now - this.startTime > this.fireInterval ) {
			this.startTime = new Date().getTime();
		}

		// material
		let skew = 0;

		if ( this.flash > 0 ) {
			skew = Math.sin( this.flash / 10 * Math.PI ) / 2;

			this.flash -= 1 * step;
		}

		this.material.skewL = skew;
		for ( let sub of this.getSubs() ) {
			sub.material.skewL = skew / ( sub.relPos.length() / 100 + 1 );
			if ( sub.altMaterial ) sub.altMaterial.skewL = skew;
		}

		this.coreMaterial.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );

		for ( let i = 0; i < this.triggers.length; i++ ) {
			if ( !this.triggerSet[i] ) {
				this.triggerSet[i] = this.triggers[i].update();	
			}
		}
	}

	explodeUpdate( step: number ) {
		let now = new Date().getTime();

		if ( now - this.startTime > 500 ) {
			let ents = this.getSubs().concat( [this] );
			let i = Math.floor( Math.random() * ents.length );

			let p = ( ents[i] as CenteredEntity ).getRandomPoint();

			this.spawnEntity( new Explosion( p ) );

			this.startTime = new Date().getTime();

			this.alpha -= 0.1;
		
			if ( this.alpha <= 0 ) {
				document.dispatchEvent( new CustomEvent( "complete", {} ) );
			}
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		context.globalAlpha = this.alpha;
		super.draw( context );
		context.globalAlpha = 1.0;
	}
}