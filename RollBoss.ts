import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'  
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Explosion } from './Explosion.js'
import { Bullet } from './Bullet.js'

class CenteredEntity extends Entity {
	altMaterial: Material = null;

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

		if ( this.altMaterial ) {
			for ( let i = 1; i < shape.edges.length; i += 2 ) {
				shape.edges[i].material = this.altMaterial;
			}	
		}

		return [shape];
	}

	getRandomPoint(): Vec2 {
		let x = -this.width / 2 + Math.random() * this.width;
		let y = -this.height / 2 + Math.random() * this.height;

		let output = new Vec2( x, y ).rotate( this.angle );

		return this.pos.plus( output );
	}

	draw( context: CanvasRenderingContext2D ) {
		context.fillStyle = this.material.getFillStyle();
		context.strokeStyle = 'black';
		context.lineWidth = 1;

		context.save();
			context.translate( this.pos.x, this.pos.y );
			context.rotate( this.angle );

			if ( this.drawWireframe ) {
				context.strokeRect( -this.width / 2, -this.height / 2, this.width, this.height );	
			} else {
				context.fillRect( -this.width / 2, -this.height / 2, this.width, this.height );	
			}

		context.restore();
	}
}

export class Barrier extends CenteredEntity {
	altMaterial = new Material( 0, 0.0, 0.3 );
	altMaterial2 = new Material( 0, 1.0, 0 );

	// overrides
	material = new Material( 0, 0.0, 0.5 );

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

			if ( this.altMaterial2 && i % quarterLen == 0 ) {
			//	shape.edges[i].material = this.altMaterial2;	
			} 
		
			shape.normals[i].flip();
		}

		return [shape];
	}

	draw( context: CanvasRenderingContext2D ) {
		//context.fillStyle = this.material.getFillStyle();
		/*context.strokeStyle = 'black';
		context.lineWidth = 1;

		context.save();
			context.translate( this.pos.x, this.pos.y );
			context.rotate( this.angle );

				context.strokeRect( -this.width / 2, -this.height / 2, this.width, this.height );	
			} else {
				context.fillRect( -this.width / 2, -this.height / 2, this.width, this.height );	
			}

		context.restore();*/
	}
}

class Gun extends CenteredEntity {
	dir: Vec2;
	flashMaterial = new Material( 0, 0, 0.2 );
	health = 2;

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

	baseMaterial: Material = new Material( 60, 1.0, 0.5 );
	flash: number = 0;

	health: number = 4;

	updateFunc = this.defaultUpdate;
	alpha: number = 1.0;

	constructor( pos: Vec2 ) {
		super( pos, 40, 40 );

		this.angle = Math.PI / 4;

		this.guns.push( new Gun( new Vec2( -this.width / 1.41, 0 ) ) );
		this.guns.push( new Gun( new Vec2( this.width / 1.41, 0 ) ) );

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

		this.material = this.baseMaterial.copy();

		this.angleVel = 0.02;

		this.spawnEntity( new Barrier( this.pos.copy(), 600 ) );
	}

	getSubs(): Array<Entity> {
		return this.tops.concat( this.bottoms ).concat( this.guns.filter( x => x.health > 0 ) );
	}

	getShapes(): Array<Shape> {
		let shapes = super.getShapes();

		for ( let sub of this.getSubs() ) {
			shapes.push( sub.getShapes()[0] );	
		}

		return shapes;
	}

	hitWith( otherEntity: Entity ): void {
		if ( otherEntity instanceof Bullet ) {
			this.flash = 10;
		}

		// direction of gun 1
		let vec = new Vec2( -1, 1 ).rotate( this.angle );

		let dir = otherEntity.pos.minus( this.pos );

		if ( vec.dot( dir ) > 0 ) {
			if ( this.guns[0].health > 0 ) {
				this.guns[0].health -= 1;	
				
				if ( this.guns[0].health <= 0 ) {
					this.angleVel *= -1.2;
				}
			} else {
				this.health -= 1;
			}

		} else {
			if ( this.guns[1].health > 0 ) {
				this.guns[1].health -= 1;	
				
				if ( this.guns[1].health <= 0 ) {
					this.angleVel *= -1.2;
				}
			} else {
				this.health -= 1;
			}
		}

		if ( this.health <= 0 ) {
			this.updateFunc = this.explode;
		}

		console.log( 'RollBoss status: ' + this.health + ' ' + this.guns[0].health + ' ' + this.guns[1].health );
	}

	update() {
		this.updateFunc();
	}

	defaultUpdate() {
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
					this.spawnEntity( sub.fire() );
				}
			}
		}

		if ( now - this.startTime > 1000 ) {
			this.startTime = new Date().getTime();
		}

		// material
		this.material.lum = this.baseMaterial.lum;

		if ( this.flash > 0 ) {
			this.material.lum = Math.abs( Math.sin( this.flash ) );

			this.flash -= 1;

		} else {
			this.flash = 0;
		}
	}

	explode() {
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