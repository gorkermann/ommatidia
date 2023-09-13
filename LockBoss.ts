import { Chrono, Anim, AnimField, PhysField, AnimFrame, MilliCountdown } from './lib/juego/Anim.js'
import { Entity, cullList } from './lib/juego/Entity.js'
import { Contact } from './lib/juego/Contact.js'
import { Material } from './lib/juego/Material.js'  
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Dict } from './lib/juego/util.js'

import { Boss, BossState } from './Boss.js'
import { CenteredEntity } from './CenteredEntity.js'
import { COL } from './collisionGroup.js'
import { Explosion } from './Explosion.js'
import { Bullet, Gutter } from './Bullet.js'

let fieldWidth = 200;
let fieldHeight = fieldWidth * 2;

export class LockBossBarrier extends CenteredEntity {

	// overrides
	material = new Material( 210, 0.0, 0.85 );
	drawWireframe = true;

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );
	}

	getShapes(): Array<Shape> {
		let shape = this.getOwnShapes()[0];


		/*let points = [];
		let segLength = 66;

		for ( let x = 0; x < this.width; x += segLength ) {
			points.push( new Vec2( x, 0 ) );
		}

		for ( let y = 0; y < this.height; y += segLength ) {
			points.push( new Vec2( this.width, y ) );
		}

		for ( let x = this.width; x > 0; x -= segLength ) {
			points.push( new Vec2( x, this.height ) );
		}

		for ( let y = this.height; y > 0; y -= segLength ) {
			points.push( new Vec2( 0, y ) );
		}

		let shape = Shape.fromPoints( points );*/
		shape.offset( new Vec2( this.pos.x, this.pos.y ) );

		//shape.material = this.material;
		//shape.parent = this;

		for ( let i = 0; i < shape.edges.length; i++ ) {
			shape.normals[i].flip();
		}

		return [shape];
	}

	draw( context: CanvasRenderingContext2D ) {
		for ( let shape of this.getShapes() ) {
			shape.stroke( context );
		}
	}
}

let wallUnit = 20;

export class LockBulb extends CenteredEntity {
	flashOffset: number = Math.random();

	constructor( pos: Vec2=new Vec2() ) {
		super( pos, wallUnit * 0.8, wallUnit * 0.8 );

		this.material = new Material( 50, 1.0, 0.5 );
		this.altMaterial = new Material( 50, 1.0, 0.5 );
	}

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeCircle( new Vec2(), this.width, 6, 0 );

		shape.material = this.material;
		shape.parent = this;

		shape.edges[1].material = this.altMaterial;

		return [shape];
	}

	shade() {
		let now = new Date().getTime();
		let sec = ( now % 1000 ) / 1000 + this.flashOffset;

		this.altMaterial.skewL = 0.5 * Math.sin( Math.PI * 2 * sec );
	}
}

let wallMaterial = new Material( 240, 1.0, 0.5 );

let LockWallState = {
	DEFAULT: 0,
	FADING: 1,
}

export class LockWall extends CenteredEntity {
	left: CenteredEntity;
	right: CenteredEntity;

	anim: Anim;

	alpha: number = 0.0;

	state: number = LockWallState.DEFAULT;

	/* property overrides */

	isGhost = true;

	material = new Material( 210, 1.0, 0.3 );
	altMaterial = new Material( 210, 1.0, 0.5 );

	constructor( pos: Vec2 ) {
		super( pos, fieldWidth, wallUnit );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		// wall sections
		let subW = Math.floor( fieldWidth / wallUnit );

		// at least 2 away from either edge, plus 0 to (subW - 4)
		let openingIndex = 2 + Math.floor( Math.random() * ( subW - 3 ) );

		let leftW = openingIndex * wallUnit;
		this.left = new CenteredEntity(
			new Vec2( -fieldWidth / 2 + leftW / 2, 0 ), leftW, wallUnit );
		this.left.material = this.material;
		this.left.altMaterial = this.altMaterial;
		this.addSub( this.left );

		let rightW = this.width - leftW;
		this.right = new CenteredEntity(
			new Vec2( fieldWidth / 2 - rightW / 2, 0 ), rightW, 20 );
		this.right.material = this.material;
		this.right.altMaterial = this.altMaterial;
		this.addSub( this.right );

		this.anim = new Anim( {
			'leftPos': new AnimField( this.left, 'pos', 1 ),
			'rightPos': new AnimField( this.right, 'pos', 1 ),
			'alpha': new AnimField( this, 'alpha', 0.1 ),
		},
		new AnimFrame( {
			'leftPos': { value: this.left.pos.copy() },
			'rightPos': { value: this.right.pos.copy() },
			'alpha': { value: 1.0, setDefault: true },
		} ) );

		let bulbCount = 4;
		let possibleBulbLocs: Array<number> = [];
		for ( let i = 0; i < subW; i++ ) {
			if ( i < openingIndex - 1 || i > openingIndex ) {
				possibleBulbLocs.push( i );
			}
		}

		// bulbs
		for ( let i = 0; i < bulbCount; i++ ) {
			let x = possibleBulbLocs.splice( Math.floor( Math.random() * possibleBulbLocs.length ), 1 )[0];

			let bulb = new LockBulb( new Vec2( ( x + 0.5 ) * wallUnit, wallUnit / 2 ) );
			bulb.collisionGroup = COL.ENEMY_BODY;

			if ( x < openingIndex ) {
				bulb.pos.x -= this.left.width / 2;
				this.left.addSub( bulb );
			
			} else {
				bulb.pos.x -= openingIndex * wallUnit;
				bulb.pos.x -= this.right.width / 2;
				this.right.addSub( bulb );
			}
		}
	}

	getBulbCount(): number {
		return this.left._subs.length + this.right._subs.length;
	}

	update( step: number, elapsed: number ) {
		this.advance( step );

		this.anim.update( step, elapsed );

		let count = this.getBulbCount();

		this.left.cull();
		this.right.cull();

		if ( count > 0 && this.getBulbCount() == 0 ) {
			let offset = new Vec2( wallUnit, 0 );

			this.anim.pushFrame( new AnimFrame( {
				'leftPos': { value: this.left.pos.minus( offset ), expireOnReach: true, setDefault: true },
				'rightPos': { value: this.right.pos.plus( offset ), expireOnReach: true, setDefault: true }
			} ) );
		}

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		if ( this.alpha <= 0 ) {
			this.destructor();
		}
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( contact.sub instanceof LockBulb ) {
				contact.sub.removeThis = true;
			}
		}
	}
}

export class LockJaw extends CenteredEntity {
	top: CenteredEntity;
	bottom: CenteredEntity;

	anim: Anim;

	alpha: number = 0.0;

	state: number = LockWallState.DEFAULT;

	speed: number = 2;

	/* property overrides */

	isGhost = true;

	material = new Material( 210, 1.0, 0.3 );
	altMaterial = new Material( 210, 1.0, 0.5 );

	constructor( pos: Vec2, speed: number ) {
		super( pos, fieldWidth, wallUnit );

		this.speed = speed;

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		// wall sections
		let subW = Math.floor( fieldWidth / wallUnit );

		let indices = [];
		for ( let i = 0; i < subW; i++ ) {
			indices.push( i );
		}

		this.top = new CenteredEntity(
			new Vec2( -fieldWidth / 2, 0 ), fieldWidth, wallUnit );
		this.top.isGhost = true;
		this.addSub( this.top );

		while ( indices.length > subW / 2 ) {
			let index = indices.splice( Math.floor( Math.random() * indices.length ), 1 )[0];

			let tooth = new CenteredEntity( new Vec2( wallUnit * ( index + 0.5 ), 0 ), wallUnit, wallUnit );
			tooth.material = this.material;
			tooth.altMaterial = this.altMaterial;
			this.top.addSub( tooth );
		}

		this.bottom = new CenteredEntity(
			new Vec2( -fieldWidth / 2, 0 ), fieldWidth, wallUnit );
		this.bottom.isGhost = true;
		this.addSub( this.bottom );

		while ( indices.length > 0 ) {
			let index = indices.splice( Math.floor( Math.random() * indices.length ), 1 )[0];

			let tooth = new CenteredEntity( new Vec2( wallUnit * ( index + 0.5 ), 0 ), wallUnit, wallUnit );
			tooth.material = this.material;
			tooth.altMaterial = this.altMaterial;
			this.bottom.addSub( tooth );
		}

		this.anim = new Anim( {
			'pos': new PhysField( this, 'pos', 'vel', this.speed ),
			'bottomPos': new PhysField( this.bottom, 'pos', 'vel', this.speed ),
			'alpha': new AnimField( this, 'alpha', 0.1 ),
		},
		new AnimFrame( {
			'pos': { value: this.pos.copy() },
			'bottomPos': { value: this.bottom.pos.copy() },
			'alpha': { value: this.alpha },
		} ) );

		this.anim.pushFrame( new AnimFrame( {
			'bottomPos': { 
				value: this.bottom.pos.plus( new Vec2( 0, wallUnit * 3 ) ), 
				expireOnReach: true, 
			},
		} ) );

		this.anim.pushFrame( new AnimFrame( { 
			'alpha': { value: 1.0, setDefault: true, expireOnReach: true }
		} ) );
	}

	update( step: number, elapsed: number ) {
		this.advance( step );

		if ( this.anim.stack.length <= 1 ) {
			this.anim.pushFrame( new AnimFrame( {
				'bottomPos': { 
					value: this.bottom.pos.copy(), 
					expireOnReach: true,
				},
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'pos': { value: this.pos.plus( new Vec2( 0, wallUnit * 6 ) ) },
				'bottomPos': { 
					value: this.bottom.pos.plus( new Vec2( 0, -wallUnit * 6 ) ), 
					expireOnReach: true,
				},
			} ) );
		}

		this.anim.update( step, elapsed );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		if ( this.alpha <= 0 ) {
			this.destructor();
		}
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;
		}
	}
}

enum LockBossState {
	STATE1 = BossState.EXPLODE + 1
}

type State = BossState | LockBossState;

export class LockBoss extends Boss {
	counts: Dict<Chrono> = {
		'createWall': new Chrono( 0, 1000 ),
	}

	walls: Array<LockWall | LockJaw> = []; 

	wallSpeed: number = 0.5;

	jawSpeed: number = 2;
	jawSpeedRise: number = 0.2;
	jawSpeedMax: number = 5;

	/* property overrides */

	state: State = BossState.DEFAULT;

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		if ( spawn ) {
			this.spawnEntity( 
				new LockBossBarrier( 
					this.pos.plus( new Vec2( 0, fieldHeight / 2 - this.height / 2 ) ), fieldWidth, fieldHeight ) );
		}

		let invisibleWall = new CenteredEntity( 
			new Vec2( 0, this.height / 2 + wallUnit ), fieldWidth, wallUnit );
		invisibleWall.material.alpha = 0.0;
		invisibleWall.collisionGroup = COL.ENEMY_BODY;
		this.addSub( invisibleWall );

		let gutter = new Gutter( new Vec2( 0, -this.height / 2 + fieldHeight - wallUnit / 2 ), fieldWidth, 10 );
		gutter.collisionGroup = COL.ENEMY_BULLET;
		this.addSub( gutter );
	}

	update( step: number, elapsed: number ) {
		// if ( this.state == RollBossState.EXPLODE ) {
		// 	this.explodeUpdate( step, elapsed );
		// } else {
		 	this.defaultUpdate( step, elapsed );
		// }

		for ( let key in this.counts ) {
			if ( this.counts[key].active && this.counts[key].count > 0 ) {
				this.counts[key].count -= elapsed;
			}
		}
	}

	defaultUpdate( step: number, elapsed: number ) {
		if ( !this.counts['createWall'].active && this.walls.length == 0 ) {
			this.counts['createWall'].active = true;
		}

		if ( this.counts['createWall'].count <= 0 ) {
			/*let wall = new LockWall( this.pos.copy().plus( new Vec2( 0, this.height / 2 + wallUnit / 2 ) ) );

			wall.vel.set( new Vec2( 0, this.wallSpeed ) );
			*/
			let pos = this.pos.copy().plus( new Vec2( 0, this.height / 2 + wallUnit / 2 ) );

			let wall = new LockJaw( pos, this.jawSpeed );
			this.jawSpeed += this.jawSpeedRise;
			this.jawSpeed = Math.min( this.jawSpeed, this.jawSpeedMax );

			this.walls.push( wall );
			this.spawnEntity( wall );

			this.counts['createWall'].active = false;
			this.counts['createWall'].reset();
		}

		for ( let wall of this.walls ) {
			let fade = false;

			if ( wall instanceof LockWall ) {
				fade = this.watchTarget &&
				 	   this.pos.plus( this.watchTarget ).y < wall.pos.y - wall.height;
			
			} else if ( wall instanceof LockJaw ) {
				fade = this.watchTarget &&
				 	   this.pos.plus( this.watchTarget ).y < wall.pos.y - wall.height &&
				 	   this.pos.plus( this.watchTarget ).y < wall.bottom.applyTransform( new Vec2() ).y - wall.height;
			}

			if ( wall.state == LockWallState.DEFAULT && fade ) {
				wall.state = LockWallState.FADING;
				wall.anim.pushFrame( new AnimFrame( { 'alpha': { value: 0.0, expireOnReach: true } } ) );
			}	
		}

		cullList( this.walls );
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			if ( contact.sub == this ) {
				otherEntity.removeThis = true;
			}
		}
	}
}