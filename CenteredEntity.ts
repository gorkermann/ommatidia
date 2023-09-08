import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

export class CenteredEntity extends Entity {
	altMaterial: Material = null;

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	getSubs(): Array<Entity> {
		return [];
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( 
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

		shape.material = this.material;
		shape.parent = this;

		if ( this.altMaterial ) {
			for ( let i = 1; i < shape.edges.length; i += 2 ) {
				shape.edges[i].material = this.altMaterial;
			}	
		}

		return [shape];
	}

	getShapes( step: number ): Array<Shape> {
		let shapes: Array<Shape> = [];

		shapes = this.getOwnShapes();

		for ( let shape of shapes ) {
			for ( let p of shape.points ) {
				if ( this.relPos ) p.add( this.relPos );
				p.rotate( this.angle + this.angleVel * step );
			}

			for ( let n of shape.normals ) {
				n.rotate( this.angle + this.angleVel * step );
			}
		}
		
		for ( let sub of this.getSubs() ) {
			shapes.push( ...sub.getShapes( step ) );
		}

		if ( !this.relPos ) {
			for ( let shape of shapes ) {
				for ( let p of shape.points ) {
					p.add( this.pos );
					p.add( this.vel.times( step ) );
				}
			}
		}

		return shapes;
	}

	// doesn't work for non-rectangles
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

		let shapes = this.getShapes( 0.0 );

		for ( let shape of shapes ) {
			if ( this.drawWireframe ) {
				shape.stroke( context );
			} else {
				shape.fill( context );
			}
		}
	}
}