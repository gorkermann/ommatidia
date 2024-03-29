import { Anim, AnimField, PhysField, AnimFrame, AnimTarget, MilliCountdown } from '../lib/juego/Anim.js'
import { TransformOrder } from '../lib/juego/Entity.js'
import { Material } from '../lib/juego/Material.js'  
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'

import { CenteredEntity } from '../CenteredEntity.js'

let wallUnit = 20;

export class Switch extends CenteredEntity {
	flashOffset: number = Math.random();

	onMaterial: Material;

	pushed: boolean = false;

	openAngle: number = 0;

	alpha: number = 1.0;

	/* property overrides */

	//transformOrder = TransformOrder.ROTATE_THEN_TRANSLATE; // if using the rotating version

	constructor( pos: Vec2=new Vec2() ) {
		super( pos, wallUnit * 0.6, wallUnit * 0.6 );

		this.material = new Material( 0, 0.0, 0.5 ); // gray
		this.onMaterial = new Material( 0, 0.0, 0.2 ); // dark gray
		this.onMaterial.emit = 0.0;

		//this.openAngle = this.width / 8; // to offset slightly from the edge

		this.anim = new Anim( {
			'openAngle': new AnimField( this, 'openAngle', 1 ),
			'angle': new PhysField( this, 'angle', 'angleVel', 0.2 ),
			'alpha': new AnimField( this, 'alpha', 0.1 ),

			'hue': new AnimField( this.onMaterial, 'hue', 6 ),
			'sat': new AnimField( this.onMaterial, 'sat', 0.1 ),
			'lum': new AnimField( this.onMaterial, 'lum', 0.1 ),
		},
		new AnimFrame( {

		} ) );		
	}

	isDone(): boolean {
		return this.pushed;
	}

	push() {
		if ( this.pushed ) {
			return;
			this.anim.clear();
			this.anim.pushFrame( new AnimFrame( {
				//'sat': { value: 1.0, expireOnReach: true, setDefault: true },
				'lum': { value: 0.2, expireOnReach: true, setDefault: true },
				//'sat': { value: 1.0, expireOnReach: true, setDefault: true },
				'openAngle': { value: 0, expireOnReach: true, setDefault: true },
			} ) );

			this.pushed = false;
		} else {
			this.anim.clear();
			// turning switch
			/*this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 0.0, expireOnReach: true, setDefault: true }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'angle': { value: this.angle + Math.PI, expireOnReach: true, setDefault: true }
			} ) );*/

			// sliding switch
			/*this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 0.0, expireOnReach: true, setDefault: true }
			} ) );*/		
			this.anim.pushFrame( new AnimFrame( {
				//'sat': { value: 1.0, expireOnReach: true, setDefault: true },
				'lum': { value: 1.0, expireOnReach: true, setDefault: true },
				//'sat': { value: 1.0, expireOnReach: true, setDefault: true },
				'openAngle': { value: this.width / 4, expireOnReach: true, setDefault: true },
			} ) );

			this.pushed = true;
		}
	}

	/*getOwnShapes(): Array<Shape> {
		let shape = Shape.makeCircle( new Vec2(), this.width, 6, 0 );
		//let shape = Shape.makeRectangle( new Vec2( -this.width / 2, -this.height / 2 ), this.width, this.height );

		//shape.points[0].x *= 0.75;
		//shape.points[3].x *= 0.75;

		for ( let point of shape.points ) {
		//	point.y *= ( 1 - this.compression );
		}

		shape.material = this.material;
		shape.parent = this;

		shape.edges[1].material = this.onMaterial;
		//shape.edges[2].material = this.altMaterial;

		return [shape];
	}*/
	
	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( new Vec2( -this.width / 2, -1 ), this.width, 2 );
		shape.parent = this;
		shape.material = this.material;

		let shape2 = Shape.makeRectangle( new Vec2( -this.openAngle, -this.width / 4 ), this.width / 2, this.width / 2 );
		shape2.parent = this;
		shape2.material = this.onMaterial;

		return [shape, shape2]
	}
}