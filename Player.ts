import { Anim, AnimField, PhysField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'

import { CenteredEntity } from './CenteredEntity.js'
import { COL } from './collisionGroup.js'
import { Coin } from './Coin.js'
import { Bullet, Gutter } from './Bullet.js'
import { Particle } from './Particle.js'

import { GravityInverter } from './entity/GravityInverter.js'

import * as Debug from './Debug.js'

import child_process from 'child_process'

export type PlayerStatus = {
	startTime: number;
	lives: number;
	defeatedNames: Array<string>;

	messages: Array<string>;
}

let RETAIN_COLLIDE_LR_WINDOW_FRAMES = 5;
let JUMP_INTENT_WINDOW_FRAMES = 5;
let slideMaterial = new Material( 60, 1.0, 0.6 );
let walkMaterial = new Material( 180, 1.0, 0.6 );

export class Player extends Entity {
	/*
		Pressing the jump button signals "jump intent"
		--> Save the jump press for a number of frames after the button press

		[Z]: press jump
		(<-): release left or right

		intended order: (<-)[Z] (same frame)
		allowed order: [Z],,,,(<-) (jump intent window)
		not allowed: [Z],,,,,(<-) (gap too long)

		allowed order: (<-),,,,[Z] (retain collide LR window) 
		not allowed: (<-),,,,,[Z] (gap too long)		
	 */
	jumpIntentFrames: number = 0; 

	jumps: number = 0;
	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;
	blockedDirs: Array<Vec2> = [];
	collideDown: boolean = false;
	collideRight: boolean = false;
	collideLeft: boolean = false;
	velIntent: Vec2 = new Vec2();

	lastFireTime: number = 0;
	fireInterval: number = 100;

	transponderCharge: number = 1.0;

	health = 10;
	wince: number = 0;
	causeOfDeath: string = '';

	messages: Array<string> = [];

	slideSoundProc: any = null;

	gravSign: number = 1.0;
	jumpSign: number = 1.0; // tracks gravSign, but not updated until the jump starts

	/* property overrides */
	anim = new Anim( {
		'wince': new AnimField( this, 'wince', 0.02 ),
		'transponderCharge': new AnimField( this, 'transponderCharge', 0.01 )
	}, new AnimFrame( {
		'wince': { value: 0.0 },
		'transponderCharge': { value: 1.0 }, // in case player anim gets cleared for some reason
	} ) );

	constructor( pos: Vec2 ) {
		super( pos, 16, 16 );
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		let damage = 0;

		if ( otherEntity instanceof Bullet ) {
			damage = 1;
			otherEntity.removeThis = true;

			this.causeOfDeath = 'You have died';

		} else if ( otherEntity instanceof Gutter ) {
			damage = 1;

			this.causeOfDeath = 'You have been incinerated';
			
		} else if ( otherEntity.collisionGroup == COL.ENEMY_BULLET ) {
			damage = 1;

			this.causeOfDeath = 'You have died';

		} else if ( otherEntity instanceof Coin ) {
			otherEntity.removeThis = true;

			//this.jumps += 1;
		}

		if ( damage > 0 && this.wince == 0.0 ) {
			this.health -= damage;

			this.wince += damage * 0.3;

			this.messages.push( 'Remaining health: ' + this.health );
		}
	}

	endSlideSound() {
		if ( this.slideSoundProc ) {
			this.slideSoundProc.kill( 'SIGINT' );
			this.slideSoundProc = null;
		}
	}

	updateGrav( grav: Vec2 ) {
		this.vel.x = this.velIntent.x;

		if ( this.collideDown ) {
			this.vel.y = 0;
		}

		// left/right
		if ( Keyboard.keyHeld( KeyCode.LEFT ) ) {
			this.vel.x += -5;
		}

		if ( Keyboard.keyHeld( KeyCode.RIGHT ) ) {
			this.vel.x += 5;
		}

		// jump
		if ( this.jumpIntentFrames > 0 ) {
			this.jumpIntentFrames -= 1;
		}
		if ( Keyboard.keyHit( KeyCode.Z ) && this.jumps > 0 ) {
			this.jumpIntentFrames = JUMP_INTENT_WINDOW_FRAMES;
		}

		if ( this.jumpIntentFrames > 0 ) {
			let jumpOk = false;

			if ( this.collideDown ) jumpOk = true;
			if ( this.collideLeft &&
				 !Keyboard.keyHeld( KeyCode.LEFT ) ) jumpOk = true;

			if ( this.collideRight &&
				 !Keyboard.keyHeld( KeyCode.RIGHT ) ) jumpOk = true;

			if ( jumpOk ) {
				this.jumpIntentFrames = 0;

				this.jumping = true;
				this.jumpFrames = this.maxJumpFrames;
				this.jumps = 0;//-= 1;
				this.jumpSign = this.gravSign;

				//this.endSlideSound(); already covered below (collideLeft/Right)?

				if ( typeof document === 'undefined' ) child_process.exec( 'aplay ./sfx/jump.wav' );
			}
		}

		if ( Keyboard.keyHeld( KeyCode.Z ) && this.jumping && this.jumpFrames > 0 ) {
			this.vel.y = -7 * this.jumpSign;
			this.jumpFrames -= 1;

		} else {
			this.jumping = false;
		}

		// apply gravity
		this.vel.y += grav.y * this.gravSign;
	}

	updateCollisionFlags( blockedContacts: Array<Contact>, grav: Vec2 ) {
		let prevCollideDown = this.collideDown;

		this.collideDown = false;
		if ( this.vel.y * this.gravSign > grav.y * RETAIN_COLLIDE_LR_WINDOW_FRAMES ) { // save collideLeft/Right for 10 frames after key is released
			this.collideRight = false;
			this.collideLeft = false;
		}
		if ( this.vel.x > 0.0001 ) {
			this.collideRight = false;
		}
		if ( this.vel.x < -0.0001 ) {
			this.collideLeft = false; 
		}

		let playLandSound = false;
		if ( typeof document === 'undefined' ) {
			if ( this.slideSoundProc && this.slideSoundProc.exitCode !== null ) {
				this.slideSoundProc = null;
			}
		}

		this.velIntent.x = 0;

		// NOTE: if colliding down, this.vel.y is already cleared by this point (by collision solver)
		let prevVelY = this.vel.y;

		let rightParticle: number = null;
		let leftParticle: number = null;

		for ( let contact of blockedContacts ) {
			let dir = contact.normal;

			if ( dir.dot( grav.times( this.gravSign ).unit() ) < -0.5 ) { // down
				
				if ( !prevCollideDown ) {
					playLandSound = true;

					// need to get rid of anomalous down collisions before implementing this
					// let alpha = 0.9;
					// let rate = 0.15;

					// let part = new Particle( new Vec2( this.pos.x, this.pos.y + this.height / 2 ), 2, 1, alpha, rate );
					// part.material = new Material( 0, 0, 1.0 );

					// this.spawned.push( part );
				}

				this.collideDown = true;
				this.jumps = 1;

				let p = contact.otherSub.unapplyTransform( contact.point.copy(), 0.0 );
				let p2 = contact.otherSub.applyTransform( p.copy(), 1.0 );

				let v = p2.minus( contact.point );

				if ( Math.abs( v.x ) < 0.0001 ) v.x = 0; // VEL_EPSILON
				if ( Math.abs( v.y ) < 0.0001 ) v.y = 0;

				this.velIntent.x += v.x;

				this.endSlideSound();
			}

			// these sometimes trigger when hitting the ground due to a diagonal normal
			// this is ok since collideLeft/Right don't inhibit horizontal movement

			// NOTE: vel.y doesn't stay at 0, gravity is added before advance() is called
			if ( dir.dot( new Vec2( -1, 0 ) ) > 0.1 && contact.otherSub.isSkiddable ) { // right
				this.collideRight = true;
				this.jumps = 1;
				this.vel.y = 0;

				if ( prevVelY * this.gravSign > 0.0001 && Keyboard.keyHeld( KeyCode.RIGHT ) ) {
					let y = Math.max( this.pos.y, contact.otherShape.minmax[0].y );
					y = Math.min( y, contact.otherShape.minmax[1].y );

					if ( rightParticle === null || Math.abs( y - this.pos.y ) < Math.abs( rightParticle - this.pos.y ) ) {
						rightParticle = y;
					}
				} else {
						let x = 0;
					}
			} else {
				let x = 0;
			}

			if ( dir.dot( new Vec2( 1, 0 ) ) > 0.1 && contact.otherSub.isSkiddable ) { // left
				this.collideLeft = true;
				this.jumps = 1;
				this.vel.y = 0;

				if ( prevVelY * this.gravSign > 0.0001 && Keyboard.keyHeld( KeyCode.LEFT ) ) {
					let y = Math.max( this.pos.y, contact.otherShape.minmax[0].y );
					y = Math.min( y, contact.otherShape.minmax[1].y );

					if ( leftParticle === null || Math.abs( y - this.pos.y ) < Math.abs( leftParticle - this.pos.y ) ) {
						leftParticle = y;
					}
				}
			}

			if ( this.collideLeft || this.collideRight ) {
				if ( !this.collideDown ) {
					if ( !this.slideSoundProc ) {
						if ( typeof document === 'undefined' ) {
							this.slideSoundProc = child_process.spawn( 'aplay', ['./sfx/slide.wav'] );
						}
					}
				}
			}
		}

		if ( playLandSound ) {
			if ( typeof document === 'undefined' ) child_process.exec( 'aplay ./sfx/land.wav' );
		}

		if ( !Keyboard.keyHeld( KeyCode.LEFT ) && 
			 !Keyboard.keyHeld( KeyCode.RIGHT ) ) {
			this.endSlideSound();
		}

		if ( !this.collideLeft && 
			 !this.collideRight ) {
			this.endSlideSound();
		}

		if ( rightParticle !== null ) {
			let alpha = 1.0;
			let rate = 0.17;
			let width = 2.5; // slightly longer than max fall speed

			let part = new Particle( new Vec2( this.pos.x + this.width / 2, rightParticle ), 1, width, alpha, rate );
			part.material = slideMaterial;

			this.spawned.push( part );
		}

		if ( leftParticle !== null ) {
			let alpha = 1.0;
			let rate = 0.17;
			let width = 2.5; // slightly longer than max fall speed

			let part = new Particle( new Vec2( this.pos.x - this.width / 2, leftParticle ), 1, width, alpha, rate );
			part.material = slideMaterial;

			this.spawned.push( part );
		}
	}

	getOwnShapes(): Array<Shape> {
		// bottom half is a rectangle, top half is a blunted triangle
		let shape = Shape.fromPoints( [
			new Vec2( this.width / 2, -this.height / 4 ),
			new Vec2( this.width / 2, this.height / 2 ), // bottom
			new Vec2( -this.width / 2, this.height / 2 ), // bottom
			new Vec2( -this.width / 2, -this.height / 4 ),
			new Vec2( -this.width / 4, -this.height / 2 ), // top
			new Vec2( this.width / 4, -this.height / 2 ), // top
		] ); 
		//let shape = Shape.makeRectangle( new Vec2( -this.width / 2, -this.height / 2 ), this.width, this.height );

		shape.material = this.material;
		shape.parent = this;

		return [shape];		
	}

	draw( context: CanvasRenderingContext2D ) {
		super.draw( context );

		context.strokeStyle = 'red';
		context.lineWidth = 2;

		for ( let blockedDir of this.blockedDirs ) {
			let a = this.pos.plus( blockedDir.times( 10 ) );

			context.beginPath();
			context.moveTo( this.pos.x, this.pos.y );
			context.lineTo( a.x, a.y );
			context.stroke(); 
		}

		context.fillStyle = 'red';

		context.save();
			context.translate( this.pos.x, this.pos.y );
			if ( this.collideDown ) { 
				context.fillRect( -this.width / 4, this.height / 4,
								 this.width / 2, this.height / 4);
			}
			// if ( this.collideUp ) { 
			// 	context.fillRect(this.pos.x + this.width / 4, this.pos.y, 
			// 					 this.width / 2, this.height / 4);
			// }
			if ( this.collideLeft ) { 
				context.fillRect(-this.width / 2, -this.height / 4,
								 this.width / 4, this.height / 2);
			}
			if ( this.collideRight ) { 
				context.fillRect(this.width / 4, -this.height / 4,
								 this.width / 4, this.height / 2);
			}
		context.restore();
	}	
}