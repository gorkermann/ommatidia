import { Chrono, Anim, AnimField, PhysField, AnimFrame, MilliCountdown } from './lib/juego/Anim.js'
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

	// overrides
	material = new Material( 210, 0.0, 0.85 );
	altMaterial = new Material( 210, 0.0, 0.75 );
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

		//this.altMaterial.skewL = 0.5 * Math.sin( Math.PI * 2 * sec );
	}
}

let wallMaterial = new Material( 240, 1.0, 0.5 );

let LockWallState = {
	DEFAULT: 0,
	FADING: 1,
	ENTERING: 2,
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

	constructor( pos: Vec2=new Vec2(), speed: number=0 ) {
		super( pos, fieldWidth, wallUnit );

		this.vel.set( new Vec2( 0, speed ) );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

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

export class LockRing extends CenteredEntity {
	moons: Array<CenteredEntity> = [];
	//wall: CenteredEntity;

	anim: Anim;

	alpha: number = 0.0;

	state: number = LockWallState.DEFAULT;

	//speed: number = 2;
	angleSpeed: number = 0.05;

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
			result += moon._subs.length;
		}

		return result;
	}

	update( step: number, elapsed: number ) {
		//this.wall.angleVel = -this.angleVel;
		for ( let moon of this.moons ) {
		//	moon.angleVel = -this.angleVel;
		}

		this.advance( step );
		this.radiusVec.add( this.radiusVel );

		this.anim.update( step, elapsed );

		let count = this.getBulbCount();

		for ( let moon of this.moons ) {
			moon.cull();
		}

		// when all bulbs are gone, expand then fade
		if ( count > 0 && this.getBulbCount() == 0 ) {
			this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 0, expireOnReach: true }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
	 			'radiusVec': { value: new Vec2( this.exteriorRadius, 0 ), 
	 						   expireOnReach: true,
	 						   setDefault: true },
	 			'angleVel': { value: 0, setDefault: true }
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

export class LockBarrage extends CenteredEntity {
	bits: Array<CenteredEntity> = [];

	anim: Anim;

	alpha: number = 0.0;

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
			frame.targets['bit' + i + 'pos'] = { 
				value: new Vec2( ( i + 0.5 ) * wallUnit * 2 - fieldWidth / 2, 
								 y * wallUnit ),
				expireOnReach: true,
				//setDefault: true
			};
			this.anim.pushFrame( frame );
		}

		// fade in
		this.anim.pushFrame( new AnimFrame( {
			'alpha': { value: 1.0, setDefault: true, expireOnReach: true },
		} ) );
	}

	update( step: number, elapsed: number ) {
		this.advance( step );

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

// LockSandwich
// two halves, one travels down, other stays up top, track player x, stop, crush
// maybe put some red herring bulbs on top one? or crush occurs when bulbs are gone

// LockBroom
// vertical 10x1 smasher that has one bulb on the end, too long and fast to get across,
// opens to two 5x1s when bulb is gone

type State = BossState;

enum WaveType {
	WALL = 0,
	JAW,
	RING,
	BARRAGE,
	length
}

// TODO: clear wall wave if boss takes damage 
export class LockBoss extends Boss {
	waves: Array<LockWall | LockJaw | LockRing | LockBarrage> = []; 

	waveQueue: Array<WaveType> = [WaveType.WALL, WaveType.WALL, WaveType.JAW, WaveType.BARRAGE,
								  WaveType.WALL, WaveType.JAW, WaveType.BARRAGE, WaveType.RING];

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

	/* property overrides */

	flavorName = 'LOCK CORE';

	health = 80;

	state: State = BossState.DEFAULT;

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	counts: Dict<Chrono> = { ...this.counts,
		'createWave': new Chrono( 3000, 1000 ),
	};

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
	}

	defaultLogic( step: number, elapsed: number ) {
		// restart wave counter if there are no waves
		if ( !this.counts['createWave'].active && this.waves.length == 0 ) {
			this.counts['createWave'].active = true;
			this.eyeAnim.clear();
			this.counts['attention'].count = 0;
		}

		// create a wave when the wave counter trips
		if ( this.counts['createWave'].count <= 0 ) {
			let type: WaveType;

			if ( this.waveQueue.length > 0 ) type = this.waveQueue.shift();
			else type = Math.floor( Math.random() * WaveType.length );

			let pos = this.pos.copy().plus( new Vec2( 0, this.height / 2 + wallUnit / 2 ) );

			if ( type == WaveType.WALL ) {
				let wall = new LockWall( pos, this.wallSpeed );

				this.wallSpeed += this.wallSpeedRise;
				this.wallSpeed = Math.min( this.wallSpeed, this.wallSpeedMax );

				this.waves.push( wall );
				this.spawnEntity( wall );
				
			} else if ( type == WaveType.JAW ) {
				let wall = new LockJaw( pos, this.jawSpeed );

				this.jawSpeed += this.jawSpeedRise;
				this.jawSpeed = Math.min( this.jawSpeed, this.jawSpeedMax );

				this.waves.push( wall );
				this.spawnEntity( wall );
			
			} else if ( type == WaveType.RING ) {
				let wall = new LockRing( pos.minus( new Vec2( 0, fieldWidth / 2 ) ), this.ringSpeed );

				this.ringSpeed += this.ringSpeedRise;
				this.ringSpeed = Math.min( this.ringSpeed, this.ringSpeedMax );

				this.waves.push( wall );
				this.spawnEntity( wall );

			} else if ( type == WaveType.BARRAGE ) {
				let wall = new LockBarrage( pos, this.barrageSpeed );

				this.barrageSpeed += this.barrageSpeedRise;
				this.barrageSpeed = Math.min( this.barrageSpeed, this.barrageSpeedMax );

				this.waves.push( wall );
				this.spawnEntity( wall );
			}

			this.counts['createWave'].active = false;
			this.counts['createWave'].reset();
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