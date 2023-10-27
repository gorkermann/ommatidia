import { Anim, AnimField, PhysField, AnimFrame, AnimTarget, MilliCountdown } from './lib/juego/Anim.js'
import { Entity, cullList, TransformOrder } from './lib/juego/Entity.js'
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

import * as Debug from './Debug.js'

let fieldWidth = 200;
let fieldHeight = fieldWidth * 2;
let wallUnit = 20;

// wall sections
let subW = Math.floor( fieldWidth / wallUnit );

export class LockBossBarrier extends CenteredEntity {

	/* property overrides */
	
	material = new Material( 210, 0.3, 0.7 );
	altMaterial = new Material( 210, 0.3, 0.9 );
	drawWireframe = true;

	constructor( pos: Vec2=new Vec2(), width: number=0, height: number=0 ) {
		super( pos, width, height );
	}

	getShapes(): Array<Shape> {
		//let shape = this.getOwnShapes()[0];

		let points = [];
		let segLength = 80;

		//for ( let x = 0; x < this.width; x += segLength ) {
			points.push( new Vec2( 0, 0 ) );
		//}

		for ( let y = 0; y < this.height; y += segLength ) {
			points.push( new Vec2( this.width, y ) );
		}

		//for ( let x = this.width; x > 0; x -= segLength ) {
			points.push( new Vec2( this.width, this.height ) );
		//}

		for ( let y = this.height; y > 0; y -= segLength ) {
			points.push( new Vec2( 0, y ) );
		}

		let shape = Shape.fromPoints( points );
		shape.offset( new Vec2( -this.width / 2, -this.height / 2 ) );
		shape.offset( new Vec2( this.pos.x, this.pos.y ) );

		shape.material = this.material;
		shape.parent = this;
		shape.hollow = true;

		if ( this.altMaterial ) {
			for ( let i = 1; i < shape.edges.length; i += 2 ) {
				shape.edges[i].material = this.altMaterial;
			}	
		}

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

export class LockBulb extends CenteredEntity {
	flashOffset: number = Math.random();

	onMaterial: Material;

	pushed: boolean = false;

	openAngle: number = 0;

	/* property overrides */

	transformOrder = TransformOrder.ROTATE_THEN_TRANSLATE;

	constructor( pos: Vec2=new Vec2() ) {
		super( pos, wallUnit * 0.6, wallUnit * 0.6 );

		this.material = new Material( 0, 0.0, 0.5 );
		this.onMaterial = new Material( 30, 0.6, 0.5 );
		this.onMaterial.emit = 0.0;

		this.anim = new Anim( {
			'openAngle': new AnimField( this, 'openAngle', 1 ),
			'angle': new PhysField( this, 'angle', 'angleVel', 0.2 ),
			'hue': new AnimField( this.onMaterial, 'hue', 6 ),
			'sat': new AnimField( this.onMaterial, 'sat', 0.1 ),
			'alpha': new AnimField( this.onMaterial, 'alpha', 0.1 ),
		},
		new AnimFrame( {

		} ) );		
	}

	isDone(): boolean {
		return this.pushed;
	}

	push() {
		if ( this.pushed ) return;

		/*this.anim.pushFrame( new AnimFrame( {
			'alpha': { value: 0.0, expireOnReach: true, setDefault: true }
		} ) );
		this.anim.pushFrame( new AnimFrame( {
			'angle': { value: this.angle + Math.PI, expireOnReach: true, setDefault: true }
		} ) );*/
		this.anim.pushFrame( new AnimFrame( {
			'alpha': { value: 0.0, expireOnReach: true, setDefault: true }
		} ) );		
		this.anim.pushFrame( new AnimFrame( {
			'hue': { value: 90, expireOnReach: true, setDefault: true },
			//'sat': { value: 1.0, expireOnReach: true, setDefault: true },
			'openAngle': { value: this.width / 2, expireOnReach: true, setDefault: true },
		} ) );

		this.pushed = true;
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

	shade() {
		let now = new Date().getTime();
		let sec = ( now % 1000 ) / 1000 + this.flashOffset;

		//this.altMaterial.skewL = 0.5 * Math.sin( Math.PI * 2 * sec );
	}
}

let wallMaterial = new Material( 240, 1.0, 0.5 );

let LockWallState = {
	DEFAULT: 0,
	FADING: 1,
	ENTERING: 2,
}

export class LockWave extends CenteredEntity {
	alpha: number = 0.0;

	constructor( pos: Vec2=new Vec2(), width: number=0, height: number=0 ) {
		super( pos, width, height );
	}

	update() {
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

export class LockWall extends LockWave {
	left: CenteredEntity;
	right: CenteredEntity;

	state: number = LockWallState.DEFAULT;

	isOpen: boolean = false;

	/* property overrides */

	isGhost = true;

	material = new Material( 210, 1.0, 0.3 );
	altMaterial = new Material( 210, 1.0, 0.5 );

	constructor( pos: Vec2=new Vec2(), speed: number=0 ) {
		super( pos, fieldWidth, wallUnit );

		this.vel.set( new Vec2( 0, speed ) );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		// index=0 is left wall
		// index=subW is 1 away from right wall
		
		// opening should be at least 2 away from either edge
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
			bulb.collisionMask = COL.PLAYER_BULLET;

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
		let count = 0;

		for ( let sub of this.left.getSubs() ) {
			if ( sub instanceof LockBulb && !sub.isDone() ) count++;
		}

		for ( let sub of this.right.getSubs() ) {
			if ( sub instanceof LockBulb && !sub.isDone() ) count++;
		}

		return count;
	}

	update() {
		if ( this.getBulbCount() == 0 && !this.isOpen ) {
			let offset = new Vec2( wallUnit, 0 );

			this.anim.pushFrame( new AnimFrame( {
				'leftPos': { value: this.left.pos.minus( offset ), expireOnReach: true, setDefault: true },
				'rightPos': { value: this.right.pos.plus( offset ), expireOnReach: true, setDefault: true }
			} ) );

			this.isOpen = true;
		}

		super.update();
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( contact.sub instanceof LockBulb ) {
				contact.sub.push();
			}
		}
	}
}

export class LockJaw extends LockWave {
	top: CenteredEntity;
	bottom: CenteredEntity;

	state: number = LockWallState.DEFAULT;

	speed: number = 2;

	/* property overrides */

	flavorName: string = 'JAWS of the LOCK CORE';

	isGhost = true;

	material = new Material( 210, 1.0, 0.3 );
	altMaterial = new Material( 210, 1.0, 0.5 );

	constructor( pos: Vec2=new Vec2(), speed: number=0 ) {
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

	animate( step: number, elapsed: number ) {
		if ( this.anim.isDone() ) {
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

		super.animate( step, elapsed );
	}
}

export class LockRing extends LockWave {
	moons: Array<CenteredEntity> = [];
	//wall: CenteredEntity;

	state: number = LockWallState.DEFAULT;

	//speed: number = 2;
	angleSpeed: number = 0.05;

	isExpanded: boolean = false;

	radiusVec = new Vec2( ( fieldWidth - wallUnit ) / 2, 0 );
	radiusVel = new Vec2();

	exteriorRadius = this.radiusVec.length();
	interiorRadius = this.radiusVec.length() - wallUnit * 2;

	/* property overrides */

	isGhost = true;

	material = new Material( 210, 1.0, 0.3 );
	altMaterial = new Material( 210, 1.0, 0.5 );

	constructor( pos: Vec2=new Vec2(), speed: number=0 ) {
		super( pos, fieldWidth, wallUnit );

		this.vel.set( new Vec2( 0, speed ) );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		let moonCount = 8;
		let bulbCount = 4;

		/*// get some random indices
		let indices: Array<number> = [];
		for ( let i = 0; i < moonCount; i++ ) {
			indices.push( i );
		}
		for ( let i = 0; i < moonCount - bulbCount; i++ ) {
			indices.splice( Math.floor( Math.random() * indices.length ), 1 );
		}*/

		// make ring sections
		for ( let i = 0; i < moonCount; i++ ) {
			let moon = new CenteredEntity( this.radiusVec, wallUnit, wallUnit * 2 );
			moon.vel = this.radiusVel;
			moon.noAdvance = true;

			moon.material = this.material;
			moon.altMaterial = this.altMaterial;

			if ( i % 2 ) {
				moon.material = this.altMaterial;
				moon.altMaterial = this.material;
			}

			moon.angle = Math.PI * 2 * i / 8;

			this.moons.push( moon );
			this.addSub( moon );
		}

		let index = Math.floor( Math.random() * this.moons.length );
		for ( let i = 0; i < bulbCount; i++ ) {
			let bulb = new LockBulb( new Vec2( -wallUnit / 2, 0 ) );
			bulb.angle = Math.PI / 2;
			bulb.collisionGroup = COL.ENEMY_BODY;
			bulb.collisionMask = COL.PLAYER_BULLET;

			this.moons[(index + i) % this.moons.length].addSub( bulb );
		}

		this.anim = new Anim( {
			'pos': new PhysField( this, 'pos', 'vel', speed ),
			'angleVel': new AnimField( this, 'angleVel', 0.05 ),
			'radiusVec': new PhysField( this, 'radiusVec', 'radiusVel', 3 ),
			'alpha': new AnimField( this, 'alpha', 0.1 ),
			'state': new AnimField( this, 'state' )
		},
		new AnimFrame( {
			'pos': { value: this.pos.plus( new Vec2( 0, fieldHeight * 2 ) ) },
			'angleVel': { value: 0 },
			'radiusVec': { value: this.radiusVec.copy() },
			'alpha': { value: 1.0 },
			'state': { value: LockWallState.DEFAULT }
		} ) );

		this.anim.pushFrame( new AnimFrame( { 
			'pos': { value: this.pos.plus( new Vec2( 0, fieldWidth - wallUnit * 2 ) ), expireOnReach: true, overrideRate: 3 },
			'angleVel': { value: ( Math.random() > 0.5 ? 1 : -1 ) * this.angleSpeed, setDefault: true },
			'alpha': { value: 1.0, setDefault: true },
			'state': { value: LockWallState.ENTERING }
		} ) );
	}

	getBulbCount(): number {
		let result = 0;

		for ( let moon of this.moons ) {
			result += moon._subs.filter( x => x instanceof LockBulb && !x.isDone() ).length;
		}

		return result;
	}

	advance( step: number ) {
		super.advance( step );

		this.radiusVec.add( this.radiusVel );
	}

	update() {

		// when all bulbs are gone, expand then fade
		if ( this.getBulbCount() == 0 && !this.isExpanded ) {
			this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 0, expireOnReach: true }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
	 			'radiusVec': { value: new Vec2( this.exteriorRadius, 0 ), 
	 						   expireOnReach: true,
	 						   setDefault: true },
	 			'angleVel': { value: 0, setDefault: true }
	 		} ) );

	 		this.isExpanded = true;
		}

		super.update();
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( contact.sub instanceof LockBulb ) {
				contact.sub.push();
			}
		}
	}
}

export class LockBarrage extends LockWave {
	bits: Array<CenteredEntity> = [];

	state: number = LockWallState.DEFAULT;

	/* property overrides */

	flavorName: string = 'BARRAGE of the LOCK CORE';

	isGhost = true;

	material = new Material( 210, 1.0, 0.5 );
	altMaterial = new Material( 210, 1.0, 0.3 );

	constructor( pos: Vec2=new Vec2(), speed: number=0 ) {
		super( pos, fieldWidth, wallUnit );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		/* create subentities */

		let bitCount = 5;

		for ( let i = 0; i < bitCount; i++ ) {
			let bit = new CenteredEntity( new Vec2( ( i + 0.5 ) * wallUnit * 2 - fieldWidth / 2, 0 ), wallUnit * 2, wallUnit );

			bit.material = this.material;
			bit.altMaterial = this.altMaterial;

			this.bits.push( bit );
			this.addSub( bit );
		}

		/* animation */

		this.anim = new Anim( {
			'alpha': new AnimField( this, 'alpha', 0.1 ),
			'vel': new AnimField( this, 'vel', 0.5 ),
		},
		new AnimFrame( {
			'alpha': { value: this.alpha },
			'vel': { value: new Vec2( 0, 0 ) },
		} ) );

		// move bits down together
		this.anim.pushFrame( new AnimFrame( {
			'vel': { value: new Vec2( 0, speed ), setDefault: true, expireOnReach: true },
		} ) );

		// move bits down separately
		let yVals = [0, 2, 4, 6, 8];
		for ( let i = 0; i < bitCount; i++ ) {
			this.anim.fields['bit' + i + 'pos'] = new PhysField( this.bits[i], 'pos', 'vel', 10 );

			let y = yVals.splice( Math.floor( Math.random() * yVals.length ), 1 )[0];

			let frame = new AnimFrame( {} );
			frame.targets['bit' + i + 'pos'] = new AnimTarget(
				new Vec2( ( i + 0.5 ) * wallUnit * 2 - fieldWidth / 2, y * wallUnit ) );
				//setDefault: true

			this.anim.pushFrame( frame );
		}

		// fade in
		this.anim.pushFrame( new AnimFrame( {
			'alpha': { value: 1.0, setDefault: true, expireOnReach: true },
		} ) );
	}
}

// LockSandwich
// two halves, one travels down, other stays up top, track player x, stop, crush
// maybe put some red herring bulbs on top one? or crush occurs when bulbs are gone

// LockBroom
// vertical 10x1 smasher that has one bulb on the end, too long and fast to get across,
// opens to two 5x1s when bulb is gone

type State = BossState;

/*enum WaveType {
	WALL = 0,
	JAW,
	RING,
	BARRAGE,
	length
}*/

let waves = {
	'wall': {

	},
	'jaw': {

	},
	'ring': {

	},
	'barrage': {

	}
};

type WaveType = keyof typeof waves;
let waveTypes: Array<WaveType> = Object.keys( waves ) as Array<WaveType>;

Debug.fields['LOCK_ATK'].default = waveTypes.join( ',' );
Debug.validators['LOCK_ATK'] = Debug.arrayOfStrings( waveTypes );

// TODO: clear wall wave if boss takes damage 
export class LockBoss extends Boss {
	waves: Array<LockWall | LockJaw | LockRing | LockBarrage> = []; 

	waveQueue: Array<WaveType> = ['wall', 'wall', 'jaw', 'barrage', 'wall', 'jaw', 'barrage', 'ring'];

	wallSpeed: number = 0.5;
	wallSpeedRise: number = 0.5;
	wallSpeedMax: number = 3;

	jawSpeed: number = 2;
	jawSpeedRise: number = 0.4;
	jawSpeedMax: number = 5;

	ringSpeed: number = 0.5;
	ringSpeedRise: number = 0.5;
	ringSpeedMax: number = 1;

	barrageSpeed: number = 8;
	barrageSpeedRise: number = 4;
	barrageSpeedMax: number = 20;

	anim = new Anim( {}, new AnimFrame( {} ) );

	/* property overrides */

	flavorName = 'LOCK CORE';

	health = 80;

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
		gutter.collisionMask = 0x00;
		this.addSub( gutter );

		this.maxHealth = this.getHealth();

		this.messages.push( 'You are in a long narrow chamber.\n' );
		this.messages.push( 'An intense heat emanates from below.\n' );
		this.messages.push( 'Above, the LOCK CORE looks on.\n' );
		this.messages.push( 'Beware, traveler!\n' );
		this.messages.push( 'Many have perished before its diabolical doors!\n' );

		this.anim.pushFrame( new AnimFrame( {},
			[ { caller: this, funcName: 'createWave' } ] ), { delay: 3000 } ); 
	}

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}

	defaultLogic() {
		if ( this.anim.isDone() && this.waves.length == 0 ) {
			this.anim.pushFrame( new AnimFrame( {},
				[ { caller: this, funcName: 'createWave' } ] ), { delay: 1000 } ); 

			this.eyeAnim.clear( { withoutTag: 'exit' } );

			this.doLook();
		}

     	// update and end waves
		for ( let wave of this.waves ) {
			let fade = false;

			if ( wave instanceof LockWall ) {
				fade = this.watchTarget && (

					   this.pos.plus( this.watchTarget ).y < wave.pos.y - wave.height ||

					   // player is at invisible wall
					   ( wave.getBulbCount() == 0 &&
					   	 this.watchTarget.y < this.height / 2 + wallUnit * 2.5 ) );
			
			} else if ( wave instanceof LockJaw ) {
				fade = this.watchTarget &&
				 	   this.pos.plus( this.watchTarget ).y < wave.pos.y - wave.height &&
				 	   this.pos.plus( this.watchTarget ).y < wave.bottom.applyTransform( new Vec2() ).y - wave.height;
			
			} else if ( wave instanceof LockRing ) {
				fade = this.watchTarget &&
			 	   	   this.pos.plus( this.watchTarget ).y < wave.pos.y - fieldWidth / 2;

			 	let waveToWatch = wave.pos.minus( this.pos.plus( this.watchTarget ) );

			 	if ( waveToWatch.length() < wave.exteriorRadius - wallUnit ) {
			 		if ( Math.abs( wave.radiusVec.length() - wave.exteriorRadius ) < 0.01 &&
			 			 wave.state == LockWallState.DEFAULT &&
			 			 wave.getBulbCount() > 0 ) {

				 		wave.anim.pushFrame( new AnimFrame( {
				 			'radiusVec': { value: new Vec2( wave.interiorRadius, 0 ), 
				 						   expireOnReach: true,
				 						   setDefault: true },
				 		} ) );
				 	}
			 	}

			} else if ( wave instanceof LockBarrage ) {
				fade = this.watchTarget &&
			 	   this.pos.plus( this.watchTarget ).y < wave.pos.y - wave.height;
			}

			if ( wave.state != LockWallState.FADING && fade ) {
				wave.state = LockWallState.FADING;
				wave.anim.pushFrame( new AnimFrame( { 'alpha': { value: 0.0, expireOnReach: true } } ) );
			}	
		}
	}

	createWave() {
		let type: WaveType;
		let attackName: string;

		if ( Debug.flags.FORCE_BOSS_ATK ) {
			let names = Debug.fields.LOCK_ATK.value.split( ',' );
			let debugAttacks = waveTypes.filter( x => names.includes( x ) );

			if ( debugAttacks.length > 0 ) {
				let index = Math.floor( Math.random() * debugAttacks.length )
				type = debugAttacks[index];

			} else {
				console.warn( 'LockBoss.defaultLogic: no valid attacks from debug' );
			}
		
		} else {
			if ( this.waveQueue.length > 0 ) type = this.waveQueue.shift();
			else type = waveTypes[Math.floor( Math.random() * waveTypes.length )];
		}
		
		let pos = this.pos.copy().plus( new Vec2( 0, this.height / 2 + wallUnit / 2 ) );

		if ( type == 'wall' ) {
			let wall = new LockWall( pos, this.wallSpeed );

			this.wallSpeed += this.wallSpeedRise;
			this.wallSpeed = Math.min( this.wallSpeed, this.wallSpeedMax );

			this.waves.push( wall );
			this.spawnEntity( wall );
			
		} else if ( type == 'jaw' ) {
			let wall = new LockJaw( pos, this.jawSpeed );

			this.jawSpeed += this.jawSpeedRise;
			this.jawSpeed = Math.min( this.jawSpeed, this.jawSpeedMax );

			this.waves.push( wall );
			this.spawnEntity( wall );
		
		} else if ( type == 'ring' ) {
			let wall = new LockRing( pos.minus( new Vec2( 0, fieldWidth / 2 ) ), this.ringSpeed );

			this.ringSpeed += this.ringSpeedRise;
			this.ringSpeed = Math.min( this.ringSpeed, this.ringSpeedMax );

			this.waves.push( wall );
			this.spawnEntity( wall );

		} else if ( type == 'barrage' ) {
			let wall = new LockBarrage( pos, this.barrageSpeed );

			this.barrageSpeed += this.barrageSpeedRise;
			this.barrageSpeed = Math.min( this.barrageSpeed, this.barrageSpeedMax );

			this.waves.push( wall );
			this.spawnEntity( wall );
		}
	}

	cull() {
		super.cull();

		cullList( this.waves );
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			if ( contact.sub == this ) {
				otherEntity.removeThis = true;

				this.doEyeStrain();

				this.health -= 1;
				if ( Debug.flags.SUPER_SHOT ) this.health -= 10;

				if ( this.health <= 0 ) {
					this.state = BossState.EXPLODE;
					this.doEyeDead();
				}
			}
		}
	}
}