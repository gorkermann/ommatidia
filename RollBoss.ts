import { Entity } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Material } from './lib/juego/Material.js'  
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { CenteredEntity } from './CenteredEntity.js'
import { COL } from './collisionGroup.js'
import { Explosion } from './Explosion.js'
import { Bullet } from './Bullet.js'

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

	constructor( relPos: Vec2 ) {
		super( new Vec2(), 40, 10 );

		this.relPos = relPos;
		this.relAngle = -Math.PI / 4;

		this.dir = this.relPos.unit();

		this.material = new Material( 60, 0.8, 0.5 );
	}

	fire(): Entity {
		return new Bullet( 
				this.pos.copy(), 
				this.dir.turned( this.angle + Math.random() - 0.5 ).scale( 5 ) );
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
	set: boolean = false;
	condition: () => boolean;
	action: () => void;
	desc: string;

	constructor( condition: () => boolean, action: () => void, desc: string='trigger set' ) {
		this.condition = condition;
		this.action = action;
		this.desc = desc;
	}

	update() {
		if ( !this.set && this.condition() ) {
			this.action();
			this.set = true;

			console.log( this.desc );
		}
	}
}

class Target {
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

export class RollBoss extends CenteredEntity {
	health: number = 20;
	alpha: number = 1.0;

	tops: Array<CenteredEntity> = []; // 225deg
	bottoms: Array<CenteredEntity> = []; // 45deg
	rollerLength: number = 60;
	shiftRollers: boolean = false;
	shifted: boolean = false;

	guns: Array<Gun> = [];
	startTime: number = 0;
	flash: number = 0;

	angleVelTarget = new Target( 0.04, 0.001 );
	
	triggers: Array<Trigger> = [];

	updateFunc = this.defaultUpdate;

	/* property overrides */

	angleVel = 0.02;

	material = new Material( 60, 1.0, 0.5 );

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	saveFields: Array<string> = this.saveFields.concat(
		['health', 'alpha', 'tops', 'bottoms', 'shifted', 'startTime', 'flash'] );

	constructor( pos: Vec2=new Vec2( 0, 0 ), createBarrier: boolean=false ) {
		super( pos, 40, 40 );

		this.angle = Math.PI / 4;

		this.guns.push( new Gun( new Vec2( -this.width / 1.41, 0 ) ) );
		this.guns.push( new Gun( new Vec2( this.width / 1.41, 0 ) ) );

		for ( let gun of this.guns ) {
			this.triggers.push( new Trigger( 
				() => gun.health <= gunHealth / 2,
				() => this.angleVelTarget.target *= -1.2,
				'RollBoss: gun health reduced to half'
			) );

			this.triggers.push( new Trigger( 
				() => gun.health <= 0,
				() => this.angleVelTarget.target *= -1.2,
				'RollBoss: gun health reduced to 0'
			) );
		}

		for ( let i = 0; i < 3; i++ ) {
			let top = new CenteredEntity( 
					new Vec2( 0, -this.height / 2 - this.rollerLength * ( i*2 + 0.5 ) ), 20, this.rollerLength );
			top.relPos = top.pos.copy();
			top.relAngle = -Math.PI / 4;
			top.material = new Material( 0, 1.0, 0.5 );
			top.altMaterial = new Material( 0, 1.0, 0.3 );
			this.tops.push( top );

			let bottom = new CenteredEntity( 
					new Vec2( 0, this.height / 2 + this.rollerLength * ( i*2 + 0.5 + ( i>0 ? -0 : 0 ) ) ), 20, this.rollerLength );
			bottom.relPos = bottom.pos.copy();
			bottom.relAngle = -Math.PI / 4;
			bottom.material = new Material( 0, 1.0, 0.5 );
			bottom.altMaterial = new Material( 0, 1.0, 0.3 );
			this.bottoms.push( bottom );
		}

		if ( createBarrier ) {
			this.spawnEntity( new Barrier( this.pos.copy(), 600 ) );
		}
	}

	getSubs(): Array<CenteredEntity> {
		return this.tops.concat( this.bottoms ).concat( this.guns.filter( x => x.health > 0 ) );
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			let hit = true;

			if ( contact.entity && contact.entity instanceof CenteredEntity ) {
				if ( this.tops.includes( contact.entity ) || 
					 this.bottoms.includes( contact.entity ) ) {
					hit = false;
				}
			}

			if ( hit ) {
				this.flash = 5;

				// check which side the bullet hit on
				let vec = new Vec2( -1, 1 ).rotate( this.angle ); // direction of gun 1

				let dir = otherEntity.pos.minus( this.pos );

				let oldHealth = this.guns.map( x => x.health );

				if ( vec.dot( dir ) > 0 ) {
					if ( this.guns[0].health > 0 ) {
						this.guns[0].health -= 1;
					} else {
						this.health -= 1;
					}

				} else {
					if ( this.guns[1].health > 0 ) {
						this.guns[1].health -= 1;
					} else {
						this.health -= 1;
					}
				}

				if ( this.health <= 0 ) {
					this.updateFunc = this.explodeUpdate;
				}

				console.log( 'RollBoss status: ' + this.health + ' ' + this.guns[0].health + ' ' + this.guns[1].health );
			}
		}
	}

	update( step: number ) {
		this.updateFunc( step );
	}

	defaultUpdate( step: number ) {
		this.pos.add( this.vel.times( step ) );
		this.angle += this.angleVel * step;

		this.angleVel = this.angleVelTarget.update( step, this.angleVel );

		if ( this.shiftRollers ) {
			// top rollers are pointing up
			if ( Math.cos( this.angle ) > 0.9999  && !this.shifted ) {
				this.shifted = true;

				for ( let i = 1; i < this.tops.length; i++ ) {
					this.tops[i].relPos.y = this.tops[i-1].relPos.y - this.rollerLength - 
							Math.floor( Math.random() * 3 ) * 40;
				}
			}

			// bottom rollers are pointing up
			if ( Math.cos( this.angle ) < -0.9999  && this.shifted ) {
				this.shifted = false;

				for ( let i = 1; i < this.bottoms.length; i++ ) {
					this.bottoms[i].relPos.y = this.bottoms[i-1].relPos.y + this.rollerLength + 
							Math.floor( Math.random() * 3 ) * 40;
				}
			}
		}

		// sub-entities
		let now = new Date().getTime();

		for ( let sub of this.getSubs() ) {
			sub.angle = this.angle + sub.relAngle;
			sub.pos = sub.relPos.turned( this.angle + sub.relAngle);
			sub.pos.add( this.pos );

			sub.angleVel = this.angleVel;

			if ( sub instanceof Gun ) {
				sub.flashMaterial.lum = ( now - this.startTime ) / 1000;
				if ( sub.flashMaterial.lum > 1.0 ) sub.flashMaterial.lum = 1.0;

				if ( now - this.startTime > 1000 ) {
					let bullet = sub.fire();

					this.spawnEntity( bullet );

					bullet.collisionGroup = COL.ENEMY_BULLET;
					bullet.collisionMask = 0x00;
				}
			}
		}

		if ( now - this.startTime > 1000 ) {
			this.startTime = new Date().getTime();
		}

		// material
		let skew = 0;

		if ( this.flash > 0 ) {
			skew = Math.sin( this.flash / 20 * Math.PI ) / 2;

			this.flash -= 1 * step;
		}

		this.material.skewL = skew;
		for ( let sub of this.getSubs() ) {
			sub.material.skewL = skew;
			if ( sub.altMaterial ) sub.altMaterial.skewL = skew;
		}

		for ( let trigger of this.triggers ) {
			trigger.update();
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

		for ( let sub of this.getSubs() ) {
			sub.draw( context );
		}
		context.globalAlpha = 1.0;
	}
}