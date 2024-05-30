import { Anim, AnimField, PhysField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'

import { CenteredEntity } from './CenteredEntity.js'
import { COL } from './collisionGroup.js'
import { Coin } from './Coin.js'
import { Bullet, Gutter } from './Bullet.js'

export type PlayerStatus = {
	startTime: number;
	lives: number;
	defeatedNames: Array<string>;

	messages: Array<string>;
}

export class Player extends Entity {
	jumps: number = 0;
	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;
	blockedDirs: Array<Vec2> = [];
	collideDown: boolean = false;
	collideRight: boolean = false;
	collideLeft: boolean = false;

	lastFireTime: number = 0;
	fireInterval: number = 100;

	health = 10;
	wince: number = 0;
	causeOfDeath: string = '';

	messages: Array<string> = [];

	/* property overrides */
	anim = new Anim( {
		'wince': new AnimField( this, 'wince', 0.02 )
	}, new AnimFrame( {
		'wince': { value: 0.0 }
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

	updateGrav( grav: Vec2 ) {
		this.vel.x = 0;
		if ( this.collideDown ) this.vel.y = 0;

		// left/right
		if ( Keyboard.keyHeld( KeyCode.LEFT ) ) {
			this.vel.x = -5;
		}

		if ( Keyboard.keyHeld( KeyCode.RIGHT ) ) {
			this.vel.x = 5;
		}

		// up/down
		if ( !this.collideDown ) {
			this.vel.y += grav.y;
			//this.vel.y = Math.min( this.vel.y, this.maxFallSpeed );
		}

		if ( Keyboard.keyHit( KeyCode.W ) && this.jumps > 0 ) {
			let jumpOk = false;

			if ( this.collideDown ) jumpOk = true;
			if ( this.collideLeft &&
				 !Keyboard.keyHeld( KeyCode.LEFT ) ) jumpOk = true;

			if ( this.collideRight &&
				 !Keyboard.keyHeld( KeyCode.RIGHT ) ) jumpOk = true;

			if ( jumpOk ) {
				this.jumping = true;
				this.jumpFrames = this.maxJumpFrames;
				this.jumps = 0;//-= 1;

				this.vel.y = 0;
			}
		}

		if ( Keyboard.keyHeld( KeyCode.W ) && this.jumping && this.jumpFrames > 0 ) {
			this.vel.y = -6;
			this.jumpFrames -= 1;

		} else {
			this.jumping = false;
		}

		this.vel.y += grav.y;
	}

	updateCollisionGrav( blockedDirs: Array<Vec2>, grav: Vec2 ) {
		this.collideDown = false;
		if ( this.vel.y > grav.y * 10 ) {
			this.collideRight = false;
			this.collideLeft = false;
		}
		if ( this.vel.x > 0.0001 ) {
			this.collideRight = false;
		}
		if ( this.vel.x < -0.0001 ) {
			this.collideLeft = false; 
		}
		for ( let dir of blockedDirs ) {
			if ( dir.dot( grav ) < -0.1 ) {
				this.collideDown = true;
				this.jumps = 1;
			}

			// these sometimes trigger when hitting the ground due to a diagonal normal
			// this is ok since collideLeft/Right don't inhibit horizontal movement
			if ( dir.dot( new Vec2( -1, 0 ) ) > 0.1 ) { // right
				this.collideRight = true;
				this.jumps = 1;
				this.vel.y = 0;
			}

			if ( dir.dot( new Vec2( 1, 0 ) ) > 0.1 ) { // left
				this.collideLeft = true;
				this.jumps = 1;
				this.vel.y = 0;
			}
		}

		// NOTE: vel.y doesn't stay at 0, gravity is added before advance() is called
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