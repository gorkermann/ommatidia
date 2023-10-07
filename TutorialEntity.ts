import { Anim, AnimField, PhysField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { Shape } from './lib/juego/Shape.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Bullet } from './Bullet.js'
import { COL } from './collisionGroup.js'
import { CenteredEntity } from './CenteredEntity.js'

export class Orbiter extends CenteredEntity {
	left: CenteredEntity;
	right: CenteredEntity;

	stall: boolean = false;

	anim = new Anim( {
		'stall': new AnimField( this, 'stall' )
	},
	new AnimFrame( {
		'stall': { value: false }
	} ) );

	/* property overrides */

	isGhost = true;

	collisionGroup = COL.LEVEL;

	constructor( pos: Vec2=new Vec2(), width: number=0 ) {
		super( pos, width, width );

		this.left = new CenteredEntity( new Vec2( -width, -width ), width, width );
		this.left.material = new Material( 210, 1.0, 0.5 );

		this.right = new CenteredEntity( new Vec2( width, width ), width, width );
		this.right.material = new Material( 210, 1.0, 0.5 );

		this.anim.fields['left-pos'] = new PhysField( this.left, 'pos', 'vel', 4 );
		this.anim.fields['right-pos'] = new PhysField( this.right, 'pos', 'vel', 4 );

		this.addSub( this.left );
		this.addSub( this.right );
	}

	animate( step: number, elapsed: number ) {
		if ( this.anim.isDone() ) {
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 500 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( -this.width, -this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( this.width, this.width ) }, 
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 500 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( -this.width, this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( this.width, -this.width ) }, 
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 500 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( this.width, this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( -this.width, -this.width ) }, 
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 500 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: new Vec2( this.width, -this.width ), expireOnReach: true },
				'right-pos': { value: new Vec2( -this.width, this.width ) }, 
			} ) );
		}

		super.animate( step, elapsed );
	}
}

export class Door extends CenteredEntity {
	left: CenteredEntity;
	right: CenteredEntity;

	stall: boolean = false;

	anim = new Anim( {
		'stall': new AnimField( this, 'stall' )
	},
	new AnimFrame( {
		'stall': { value: false }
	} ) );

	/* property overrides */

	isGhost = true;

	collisionGroup = COL.LEVEL;

	constructor( pos: Vec2=new Vec2(), totalWidth: number=0, height: number=0 ) {
		super( pos, totalWidth, height );

		this.left = new CenteredEntity( new Vec2( -totalWidth / 4, 0 ), totalWidth / 2, height );
		this.left.material = new Material( 210, 1.0, 0.5 );

		this.right = new CenteredEntity( new Vec2( totalWidth / 4, 0 ), totalWidth / 2, height );
		this.right.material = new Material( 210, 1.0, 0.5 );

		this.anim.fields['left-pos'] = new PhysField( this.left, 'pos', 'vel', 2 );
		this.anim.fields['right-pos'] = new PhysField( this.right, 'pos', 'vel', 2 );

		this.addSub( this.left );
		this.addSub( this.right );
	}

	animate( step: number, elapsed: number ) {
		if ( this.anim.isDone() ) {
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 500 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: this.left.pos.copy(), expireOnReach: true },
				'right-pos': { value: this.right.pos.copy() }, 
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 500 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'left-pos': { value: this.left.pos.plus( new Vec2( -20, 0 ) ), expireOnReach: true },
				'right-pos': { value: this.right.pos.plus( new Vec2( 20, 0 ) ) }, 
			} ) );
		}

		super.animate( step, elapsed );
	}
}

export class Elevator extends CenteredEntity {
	top: CenteredEntity;
	bottom: CenteredEntity;

	stall: boolean = false;

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', 1 ),
		'stall': new AnimField( this, 'stall' )
	},
	new AnimFrame( {
		'stall': { value: false }
	} ) );

	/* property overrides */

	isGhost = true;

	collisionGroup = COL.LEVEL;

	constructor( pos: Vec2=new Vec2(), width: number=0 ) {
		super( pos, width, width );

		this.top = new CenteredEntity( new Vec2( 0, 0 ), width * 3, width );
		this.top.material = new Material( 210, 1.0, 0.5 );

		this.bottom = new CenteredEntity( new Vec2( 0, width * 2 ), width * 3, width );
		this.bottom.material = new Material( 210, 1.0, 0.5 );

		this.anim.fields['top-pos'] = new PhysField( this.top, 'pos', 'vel', 4 );
		this.anim.fields['bottom-pos'] = new PhysField( this.bottom, 'pos', 'vel', 4 );

		this.addSub( this.top );
		this.addSub( this.bottom );
	}

	animate( step: number, elapsed: number ) {
		if ( this.anim.isDone() ) {
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 1000 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'pos': { value: this.pos.copy(), expireOnReach: true },
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'stall': { value: true, expireOnCount: 1000 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'pos': { value: this.pos.plus( new Vec2( 0, this.width * -2 ) ), expireOnReach: true },
			} ) );
		}

		super.animate( step, elapsed );
	}
}

export class Tumbler extends CenteredEntity {
	stall: boolean = false;

	/* property overrides */

	angleVel = 0.04;

	collisionGroup = COL.LEVEL;

	constructor( pos: Vec2=new Vec2() ) {
		super( pos, 100, 100 );

		this.material = new Material( 210, 1.0, 0.5 );
	}

	getOwnShapes(): Array<Shape> {
		let shapes = [];

		shapes.push( Shape.makeRectangle( new Vec2( -50, -50 ), 100, 20 ) );
		shapes.push( Shape.makeRectangle( new Vec2( -50, -30 ), 20, 60 ) );
		shapes.push( Shape.makeRectangle( new Vec2( -50, 30 ), 100, 20 ) );

		shapes.push( Shape.makeRectangle( new Vec2( 30, -30 ), 20, 20 ) );
		shapes.push( Shape.makeRectangle( new Vec2( 30, 10 ), 20, 20 ) );

		for ( let shape of shapes ) {
			shape.material = this.material;
			shape.parent = this;
		}

		return shapes;
	}
}

export class Blocker extends CenteredEntity {
	watchTarget: Vec2 = null; // relative to this.pos
	cycleHue: boolean = true;

	left: CenteredEntity;
	right: CenteredEntity;

	/* property overrides */

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET | COL.LEVEL;
	isPliant = true;

	material = new Material( 30, 1.0, 0.5 );

	anim = new Anim( { 
		'pos': new PhysField( this, 'pos', 'vel', 4 ),
		'skewL': new AnimField( this.material, 'skewL', 0 ),
		'cycleHue': new AnimField( this, 'cycleHue' ),
	},
	new AnimFrame( {
		'skewL': { value: 0 },
		'cycleHue': { value: true }
	} ) );

	constructor( pos: Vec2=new Vec2() ) {
		super( pos, 10, 20 );

		this.left = new CenteredEntity( new Vec2( -20, 0 ), 30, 20 );
		this.left.material = new Material( 210, 1.0, 0.5 );

		this.right = new CenteredEntity( new Vec2( 20, 0 ), 30, 20 );
		this.right.material = new Material( 210, 1.0, 0.5 );

		this.addSub( this.left );
		this.addSub( this.right );
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeCircle( new Vec2( 0, 0 ), 10, 12 );

		shape.material = this.material;
		shape.parent = this;

		let whiteMaterial = new Material( 0, 0.0, 1.0 );
		shape.edges[2].material = whiteMaterial;
		shape.edges[3].material = whiteMaterial;

		return [shape];
	}

	watch( target: Vec2 ) {
		this.watchTarget = target.copy();//target.minus( this.pos );
	}

	animate( step: number, elapsed: number ) {
		if ( this.anim.isDone() ) {
			this.anim.pushFrame( new AnimFrame( {
				'pos': { value: new Vec2( this.watchTarget.x, this.pos.y ), expireOnCount: 100 },
			} ) );
		}

		super.animate( step, elapsed );
	}

	shade() {
		let now = new Date().getTime();

		if ( this.cycleHue ) {
			this.material.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );
		}

		this.left.material.skewL = this.material.skewL;
		this.right.material.skewL = this.material.skewL;
	}

	hitWith( otherEntity: Entity ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			this.anim.clear();
			this.anim.pushFrame( new AnimFrame( {
				'cycleHue': { value: true, expireOnReach: true }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'skewL': { value: 0.0, reachOnCount: 1000 },
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'skewL': { value: 0.5, expireOnReach: true, overrideRate: 0 },
				'cycleHue': { value: false }
			} ) );
		}
	}
}