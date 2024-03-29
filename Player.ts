import { Anim, AnimField, PhysField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { CenteredEntity } from './CenteredEntity.js'
import { COL } from './collisionGroup.js'
import { Coin } from './Coin.js'
import { Bullet, Gutter } from './Bullet.js'

export type PlayerStatus = {
	startTime: number;
	lives: number;
	defeatedNames: Array<string>;
}

export class Player extends Entity {
	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;
	blockedDirs: Array<Vec2> = [];
	collideDown: boolean = false;

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
		}

		if ( damage > 0 && this.wince == 0.0 ) {
			this.health -= damage;

			this.wince += damage * 0.3;

			this.messages.push( 'Remaining health: ' + this.health );
		}
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeCircle( 
				new Vec2( 0, 0 ), this.width, 8, 0.5 );

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
	}	
}