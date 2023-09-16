import { Chrono, Anim, AnimField, AnimFrame } from './lib/juego/Anim.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Shape } from './lib/juego/Shape.js'
import { Dict } from './lib/juego/util.js'

import { CenteredEntity } from './CenteredEntity.js'
import { Explosion } from './Explosion.js'

export enum BossState {
	DEFAULT = 0,
	EXPLODE,
}

export class Boss extends CenteredEntity {
	health: number = 20;
	maxHealth: number; // need to set in constructor

	watchTarget: Vec2 = null; // relative to this.pos

	alpha: number = 1.0;

	coreMaterial = new Material( 30, 1.0, 0.5 );
	whiteMaterial = new Material( 0, 1.0, 1.0 );
	pupilMaterial = new Material( 0, 0.0, 0.0 );

	state: number = BossState.DEFAULT;

	blink: number = 0.0; // 0.0 - 1.0;
	eyeStrain: number = 0.0;
	eyeAngle: number = 0;

	counts: Dict<Chrono> = {
		'attention': new Chrono( 0, 5000 ),
		'blink': new Chrono( 0, 3000 ),
		'explode': new Chrono( 0, 500 )
	}

	eyeAnim = new Anim( {
		'blink': new AnimField( this, 'blink', 0.2 ),
		'eyeStrain': new AnimField( this, 'eyeStrain', 0.5 ),
		'eyeAngle': new AnimField( this, 'eyeAngle', 0.1 ),
	},
	new AnimFrame( {
		'blink': { value: 0.0 },
		'eyeStrain': { value: 0.0 },
		'eyeAngle': { value: 0.0 },
	} ) );

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	watch( target: Vec2 ) {
		this.watchTarget = target.minus( this.pos );
	}

	getOwnShapes(): Array<Shape> {
		let shapes = [];

		let core = Shape.makeCircle( new Vec2( 0, 0 ), 39, 36 );
		core.material = this.coreMaterial;
		core.parent = this;

		for ( let point of core.points ) {
			point.rotate( this.eyeAngle );
		}

		if ( this.blink < 0.8 ) {
			core.edges[6].material = this.whiteMaterial;
			core.edges[7].material = this.whiteMaterial;//new Material( 0, 0.5, 0.4 );
			//core.points[7].rotate( Math.PI * 2 / 36 / 2 );
			core.edges[8].material = this.pupilMaterial;
			core.edges[9].material = this.pupilMaterial;
			core.edges[10].material = this.whiteMaterial;//new Material( 0, 0.5, 0.4 );
			//core.points[11].rotate( -Math.PI * 2 / 36 / 2 );
			core.edges[11].material = this.whiteMaterial;
		}

		let start = 6;
		let mid = 9;
		let max = 12;

		for ( let i = start; i <= max; i++ ) {
			
			// angle toward middle of eye
			let angle = ( mid - i ) / 36 * Math.PI * 2;
			if ( i >= mid ) angle = ( mid - i ) / 36 * Math.PI * 2;

			if ( i >= 8 && i <= 10 ) {
				core.points[i].rotate( angle * this.eyeStrain );
			} else {
				core.points[i].rotate( angle * this.blink );
			}
		}

		let altM = new Material( 0, 1.0, 0.7 );
		for ( let i = 1; i < core.edges.length; i += 2 ) {
		//	core.edges[i].material = altM;
		}

		shapes.push( core );

		return shapes;
	}

	getBody(): Array<CenteredEntity> { return [this] };

	getHealth(): number {
		return Math.max( this.health, 0 );
	}

	update( step: number, elapsed: number ) {
		if ( this.state != BossState.EXPLODE ) {
			this.advance( step );
		}

		for ( let key in this.counts ) {
			this.counts[key].update( elapsed );
		}

		this.animate( step, elapsed );

		if ( this.state == BossState.EXPLODE ) {
			this.explodeLogic( step, elapsed );
		} else {
			this.defaultLogic( step, elapsed );
		}
	}

	animate( step: number, elapsed: number ) {
		if ( this.counts['blink'].count <= 0 ) {
			this.eyeAnim.pushFrame( new AnimFrame( {
				'blink': { value: 1.0, expireOnReach: true }
			} ) );

			this.counts['blink'].reset();
		}

		if ( this.watchTarget && this.counts['attention'].count <= 0 ) {
			this.eyeAnim.pushFrame( new AnimFrame( {
				'eyeAngle': { value: this.watchTarget.angle() - Math.PI / 2, expireOnReach: true, setDefault: true }
			} ) );

			this.counts['attention'].reset();
		}

		this.eyeAnim.update( step, elapsed );
	}

	doEyeStrain() {
		this.eyeAnim.clear();
		this.eyeAnim.pushFrame( new AnimFrame( {
			'blink': { value: -1, expireOnCount: 500, overrideRate: 0.5 },
			'eyeStrain': { value: 0.5 }
		} ) );
	}

	doEyeDead() {
		this.eyeAnim.clear();
		this.eyeAnim.pushFrame( new AnimFrame( {
			'blink': { value: 1.0, expireOnReach: true, overrideRate: 0.04, setDefault: true },
			'eyeStrain': { value: 0.0, setDefault: true }
		} ) );
	}

	defaultLogic( step: number, elapsed: number ) {}

	explodeLogic( step: number, elapsed: number ) {
		this.counts['attention'].active = false;
		this.counts['blink'].active = false;

		if ( this.counts['explode'].count <= 0 ) {
			let entities = this.getBody();
			let i = Math.floor( Math.random() * entities.length );

			let p = ( entities[i] as CenteredEntity ).getRandomPoint();

			this.spawnEntity( new Explosion( p ) );

			this.alpha -= 0.1;
		
			if ( this.alpha <= 0 ) {
				document.dispatchEvent( new CustomEvent( "complete", {} ) );
			}

			this.counts['explode'].reset();
		}
	}

	shade() {
		let now = new Date().getTime();

		if ( this.state == BossState.EXPLODE ) {
			this.coreMaterial.skewS = -( 1 - this.alpha );

		} else {
			this.coreMaterial.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );
		}

		if ( this.blink < 0 ) {
			this.pupilMaterial.skewL = Math.sin( Math.PI * ( now % 200 ) / 200 );
			this.whiteMaterial.skewL = -0.2 * Math.sin( Math.PI * ( now % 133 ) / 133 );
			this.whiteMaterial.skewH = 30 * Math.sin( Math.PI * ( now % 200 ) / 200 );
		} else {
			this.pupilMaterial.skewL = 0;
			this.whiteMaterial.skewL = 0;
			this.whiteMaterial.skewH = 0;
		}

		super.shade();
	}

	draw( context: CanvasRenderingContext2D ) {
		context.globalAlpha = this.alpha;
		super.draw( context );
		context.globalAlpha = 1.0;
	}
}