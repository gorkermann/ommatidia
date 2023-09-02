import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'  
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Bullet } from './Bullet.js'

class CenteredEntity extends Entity {
	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	getShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( 
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

		//shape.edges[0].material = new Material( 0, 1.0, 0.5 );
		//shape.edges[2].material = new Material( 0, 1.0, 0.5 );

		for ( let p of shape.points ) {
			p.rotate( this.angle );
			p.add( this.pos );
		}

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}

	draw( context: CanvasRenderingContext2D ) {
		context.fillStyle = this.material.getFillStyle();

		context.save();
			context.translate( this.pos.x, this.pos.y );
			context.rotate( this.angle );
			context.fillRect( -this.width / 2, -this.height / 2, this.width, this.height );
		context.restore();
	}
}

export class RollBoss extends Entity {
	tops: Array<CenteredEntity> = [];
	bottoms: Array<CenteredEntity> = [];

	shifted: boolean = false;

	rollerLength: number = 60;

	startTime: number = 0;

	constructor( pos: Vec2 ) {
		super( pos, 40, 40 );

		for ( let i = 0; i < 3; i++ ) {
			let top = new CenteredEntity( 
					new Vec2( 0, -this.height / 2 - this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			top.relPos = top.pos.copy();
			top.material = new Material( 0, 1.0, 0.5 );
			this.tops.push( top );

			let bottom = new CenteredEntity( 
					new Vec2( 0, this.height / 2 + this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			bottom.relPos = bottom.pos.copy();
			bottom.material = new Material( 0, 1.0, 0.5 );
			this.bottoms.push( bottom );
		}

		this.angleVel = 0.02;
	}

	getShapes(): Array<Shape> {
		let shapes = super.getShapes();

		for ( let top of this.tops ) {
			shapes.push( top.getShapes()[0] );	
		}
		
		for ( let bottom of this.bottoms ) {
			shapes.push( bottom.getShapes()[0] );	
		}

		return shapes;
	}

	update() {
		this.pos.add( this.vel );
		this.angle += this.angleVel;

		if ( Math.cos( this.angle ) > 0.9999  && !this.shifted ) {
			this.shifted = true;

			for ( let i = 1; i < this.tops.length; i++ ) {
				this.tops[i].relPos.y = this.tops[i-1].relPos.y - this.rollerLength - 
						Math.floor( Math.random() * 3 ) * 40;
			}
		}

		if ( Math.cos( this.angle ) < -0.9999  && this.shifted ) {
			this.shifted = false;

			for ( let i = 1; i < this.bottoms.length; i++ ) {
				this.bottoms[i].relPos.y = this.bottoms[i-1].relPos.y + this.rollerLength + 
						Math.floor( Math.random() * 3 ) * 40;
			}
		}

		let origin = this.pos.plus( new Vec2( this.width / 2, this.height / 2 ) );

		// sub-entities
		for ( let top of this.tops ) {
			top.angle = this.angle;
			top.pos = top.relPos.turned( this.angle );
			top.pos.add( origin );

			top.angleVel = this.angleVel;
		}

		for ( let bottom of this.bottoms ) {
			bottom.angle = this.angle;
			bottom.pos = bottom.relPos.turned( this.angle );
			bottom.pos.add( origin );
		
			bottom.angleVel = this.angleVel;
		}

		if ( new Date().getTime() - this.startTime > 1000 ) {
			this.spawnEntity( 
					new Bullet( this.pos.copy(), Vec2.fromPolar( Math.PI / 2 + Math.random() - 0.5, 5 ) ) );

			this.startTime = new Date().getTime();
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		super.draw( context );

		for ( let top of this.tops ) {
			top.draw( context );
		}

		for ( let bottom of this.bottoms ) {
			bottom.draw( context );
		}
	}
}