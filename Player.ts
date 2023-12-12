import { Entity } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { CenteredEntity } from './CenteredEntity.js'
import { COL } from './collisionGroup.js'
import { Coin } from './Coin.js'
import { Bullet, Gutter } from './Bullet.js'

export class Player extends Entity {
	jumping: boolean = false;
	maxJumpFrames: number = 20;
	jumpFrames: number = 0;
	blockedDirs: Array<Vec2> = [];

	health = 1;
	causeOfDeath: string = '';

	constructor( pos: Vec2 ) {
		super( pos, 16, 16 );
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			this.health -= 1;
			if ( this.health > 0 ) otherEntity.removeThis = true;

			this.causeOfDeath = 'You have been run through by a LASER BURST from the ROLL CORE';

		} else if ( otherEntity instanceof Gutter ) {
			this.health -= 1;

			this.causeOfDeath = 'You have been incinerated by the GUTTER';
			
		} else if ( otherEntity.collisionGroup == COL.ENEMY_BULLET ) {
			this.health -= 1;

			this.causeOfDeath = 'You have been hit by an unidentified BULLET';

		} else if ( otherEntity instanceof Coin ) {
			otherEntity.removeThis = true;
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