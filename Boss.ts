import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Shape } from './lib/juego/Shape.js'

import { CenteredEntity } from './CenteredEntity.js'

export enum BossState {
	DEFAULT = 0,
	EXPLODE,
}

export class Boss extends CenteredEntity {
	watchTarget: Vec2 = null; // relative to this.pos

	alpha: number = 1.0;

	coreMaterial = new Material( 30, 1.0, 0.5 );

	state: number = BossState.DEFAULT;

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	watch( target: Vec2 ) {
		this.watchTarget = target.minus( this.pos );
	}

	getOwnShapes(): Array<Shape> {
		let shapes = [];

		let core = Shape.makeCircle( new Vec2( 0, 0 ), 39, 9 );
		core.material = this.coreMaterial;
		core.parent = this;

		let altM = new Material( 0, 1.0, 0.7 );
		for ( let i = 1; i < core.edges.length; i += 2 ) {
		//	core.edges[i].material = altM;
		}

		shapes.push( core );

		return shapes;
	}

	shade() {
		if ( this.state == BossState.EXPLODE ) {
			this.coreMaterial.skewS = -( 1 - this.alpha );

		} else {
			let now = new Date().getTime();
			this.coreMaterial.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );
		}

		super.shade();
	}

	draw( context: CanvasRenderingContext2D ) {
		context.globalAlpha = this.alpha;
		super.draw( context );
		context.globalAlpha = 1.0;
	}
}