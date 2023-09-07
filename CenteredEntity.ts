import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

export class CenteredEntity extends Entity {
	altMaterial: Material = null;

	/* property overrides */

	saveFields: Array<string> = this.saveFields.concat( ['altMaterial'] );

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	getSubs(): Array<Entity> {
		return [];
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( 
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

		for ( let p of shape.points ) {
			p.rotate( this.angle );
			p.add( this.pos );
		}

		for ( let n of shape.normals ) {
			n.rotate( this.angle );
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

	getShapes( step: number ): Array<Shape> {
		let shapes = this.getOwnShapes();

		for ( let sub of this.getSubs() ) {
			shapes.push( ...sub.getShapes( step ) );	
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