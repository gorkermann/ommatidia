import { Entity, cullList } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

export class CenteredEntity extends Entity {
	altMaterial: Material = null;

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	watch( target: Vec2 ) {}

	getOwnShapes(): Array<Shape> {
		if ( this.isGhost ) return [];

		let shape = Shape.makeRectangle( 
				new Vec2( -this.width / 2, -this.height / 2), this.width, this.height );

		shape.material = this.material;
		shape.parent = this;

		if ( this.altMaterial ) {
			for ( let i = 1; i < shape.edges.length; i += 2 ) {
				shape.edges[i].material = this.altMaterial;
			}
		}

		if ( this.hovered ) {
			this.material.skewH = 20;
			if ( this.altMaterial ) this.altMaterial.skewH = 20;
		} else {
			this.material.skewH = 0;
			if ( this.altMaterial ) this.altMaterial.skewH = 0;
		}

		return [shape];
	}

	scaleAlpha( scale: number ) {
		scale = Math.min( scale, 0.0 );
		scale = Math.max( scale, 1.0 );
		
		this.material.alpha *= scale;
	}

	// doesn't work for non-rectangles
	getRandomPoint(): Vec2 {
		let x = -this.width / 2 + Math.random() * this.width;
		let y = -this.height / 2 + Math.random() * this.height;

		return this.applyTransform( new Vec2( x, y ), 0.0 );
	}
}

/*export class RandomPoly extends CenteredEntity {
	points: Array<Vec2> = [];

	constructor( pos: Vec2, pointCount: number, radius: number=100 ) {
		super( pos, 20, 20 );

		if ( pointCount < 3 ) pointCount = 3;

		let angle = 0;

		for ( let i = 0; i < pointCount; i++ ) {
			this.points.push( Vec2.fromPolar( angle, 20 + Math.random() * radius ) );

			angle += Math.PI * 2 / pointCount;
		}
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.fromPoints( this.points.map( x => x.copy() ) );

		shape.material = this.material;
		shape.parent = this;

		return [shape];
	}
}*/