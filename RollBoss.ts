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

class Gun extends CenteredEntity {
	dir: Vec2;
	flashMaterial = new Material( 0, 0, 0.2 );

	constructor( relPos: Vec2 ) {
		super( new Vec2(), 40, 10 );

		this.relPos = relPos;
		this.relAngle = -Math.PI / 4;

		this.dir = this.relPos.unit();

		this.material = new Material( 60, 0.8, 0.5 );
	}

	fire(): Entity {
		return new Bullet( 
				this.pos, 
				this.dir.turned( this.angle + Math.random() - 0.5 ).scale( 5 ) );
	}

	getShapes(): Array<Shape> {
		let shapes = super.getShapes();

		// make the short edges black
		shapes[0].edges[1].material = this.flashMaterial;
		shapes[0].edges[3].material = this.flashMaterial;
		return shapes;
	}
}

export class RollBoss extends CenteredEntity {
	tops: Array<CenteredEntity> = []; // 225deg
	bottoms: Array<CenteredEntity> = []; // 45deg

	shifted: boolean = false;

	rollerLength: number = 60;

	startTime: number = 0;

	guns: Array<Gun> = [];

	constructor( pos: Vec2 ) {
		super( pos, 40, 40 );

		this.angle = Math.PI / 4;

		this.guns.push( new Gun( new Vec2( -this.width / 1.41 ) ) );
		this.guns.push( new Gun( new Vec2( this.width / 1.41 ) ) );

		for ( let i = 0; i < 3; i++ ) {
			let top = new CenteredEntity( 
					new Vec2( 0, -this.height / 2 - this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			top.relPos = top.pos.copy();
			top.relAngle = -Math.PI / 4;
			top.material = new Material( 0, 1.0, 0.5 );
			this.tops.push( top );

			let bottom = new CenteredEntity( 
					new Vec2( 0, this.height / 2 + this.rollerLength * ( i + 0.5 ) ), 20, this.rollerLength );
			bottom.relPos = bottom.pos.copy();
			bottom.relAngle = -Math.PI / 4;
			bottom.material = new Material( 0, 1.0, 0.5 );
			this.bottoms.push( bottom );
		}

		this.angleVel = 0.02;

		this.material = new Material( 30, 1.0, 0.5 );
	}

	getSubs(): Array<Entity> {
		return this.tops.concat( this.bottoms ).concat( this.guns );
	}

	getShapes(): Array<Shape> {
		let shapes = super.getShapes();

		for ( let sub of this.getSubs() ) {
			shapes.push( sub.getShapes()[0] );	
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

		// sub-entities
		for ( let sub of this.getSubs() ) {
			sub.angle = this.angle + sub.relAngle;
			sub.pos = sub.relPos.turned( this.angle + sub.relAngle);
			sub.pos.add( this.pos );

			sub.angleVel = this.angleVel;
		}

		let now = new Date().getTime();

		for ( let gun of this.guns ) {
			gun.flashMaterial.lum = ( now - this.startTime ) / 1000;
			if ( gun.flashMaterial.lum > 1.0 ) gun.flashMaterial.lum = 1.0;
		}

		if ( now - this.startTime > 1000 ) {
			for ( let gun of this.guns ) {
				this.spawnEntity( gun.fire() );
			}

			this.startTime = new Date().getTime();
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		super.draw( context );

		for ( let sub of this.getSubs() ) {
			sub.draw( context );
		}
	}
}