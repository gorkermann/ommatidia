import { Anim, AnimField, PhysField, AnimFrame, AnimTarget, MilliCountdown } from '../lib/juego/Anim.js'
import { Entity, cullList, TransformOrder } from '../lib/juego/Entity.js'
import { Contact } from '../lib/juego/Contact.js'
import { Material } from '../lib/juego/Material.js'  
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { Dict } from '../lib/juego/util.js'

import { Boss, BossState } from './Boss.js'
import { Switch } from './Switch.js'

import { CenteredEntity } from '../CenteredEntity.js'
import { COL } from '../collisionGroup.js'
import { Explosion } from '../Explosion.js'
import { Bullet, Gutter } from '../Bullet.js'

import * as Debug from '../Debug.js'

let fieldWidth = 160;
let fieldHeight = 360;
let wallUnit = 20;

// wall sections
let subW = Math.floor( fieldWidth / wallUnit );

export class LockBossBarrier extends CenteredEntity {

	/* property overrides */
	
	material = new Material( 150, 0.3, 0.7 );
	altMaterial = new Material( 150, 0.3, 0.9 );
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
		shape.points.map( x => x.add( new Vec2( -this.width / 2, -this.height / 2 ) ) );
		shape.points.map( x => x.add( new Vec2( this.pos.x, this.pos.y ) ) );

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

let wallMaterial = new Material( 240, 1.0, 0.5 );

let LockWallState = {
	DEFAULT: 0,
	FADING: 1,
	ENTERING: 2,
}

export class LockWave extends CenteredEntity {
	alpha: number = 0.0;

	/* property overrides */

	editFields: Array<string> = this.editFields.concat( ['vel'] );

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

	material =  new Material( 150, 1.0, 0.3 );
	altMaterial =  new Material( 150, 1.0, 0.5 );

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

			let bulb = new Switch( new Vec2( ( x + 0.5 ) * wallUnit, wallUnit / 2 ) );
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
			if ( sub instanceof Switch && !sub.isDone() ) count++;
		}

		for ( let sub of this.right.getSubs() ) {
			if ( sub instanceof Switch && !sub.isDone() ) count++;
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

			if ( this.getBulbCount() > 0 ) {
				if ( contact.sub instanceof Switch ) {
					contact.sub.push();
				}
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

	material = new Material( 150, 1.0, 0.3 );
	altMaterial = new Material( 150, 1.0, 0.5 );

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

	material = new Material( 150, 1.0, 0.3 );
	altMaterial = new Material( 150, 1.0, 0.5 );

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
			let bulb = new Switch( new Vec2( -wallUnit / 2, 0 ) );
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
			result += moon._subs.filter( x => x instanceof Switch && !x.isDone() ).length;
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

			if ( contact.sub instanceof Switch ) {
				contact.sub.push();
			}
		}
	}
}

export class LockHole extends LockWave {
	bits: Array<CenteredEntity> = [];

	state: number = LockWallState.DEFAULT;

	/* property overrides */

	flavorName: string = 'HOLEWALL of the LOCK CORE';

	isGhost = true;

	material = new Material( 150, 1.0, 0.5 );
	altMaterial = new Material( 150, 1.0, 0.3 );

	constructor( pos: Vec2=new Vec2(), speed: number=0 ) {
		super( pos, fieldWidth, wallUnit );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		/* create subentities */

		let bitCount = 8;
		let bitWidth = wallUnit;
		let totalWidth = bitCount * bitWidth;
		let index = 1 + Math.floor( Math.random() * ( bitCount - 2 ) );

		for ( let i = 0; i < bitCount; i++ ) {
			if ( i == index ) continue;

			let bit = new CenteredEntity( new Vec2( ( i + 0.5 ) * bitWidth - totalWidth / 2, 0 ), bitWidth, wallUnit );

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

		// fade in
		this.anim.pushFrame( new AnimFrame( {
			'alpha': { value: 1.0, setDefault: true, expireOnReach: true },
		} ) );
	}
}

export class LockBarrage extends LockWave {
	bits: Array<CenteredEntity> = [];

	state: number = LockWallState.DEFAULT;

	/* property overrides */

	flavorName: string = 'BARRAGE of the LOCK CORE';

	isGhost = true;

	material = new Material( 150, 1.0, 0.5 );
	altMaterial = new Material( 150, 1.0, 0.3 );

	constructor( pos: Vec2=new Vec2(), speed: number=0 ) {
		super( pos, fieldWidth, wallUnit );

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		/* create subentities */

		let bitCount = 5;
		let width = bitCount * wallUnit * 2;

		for ( let i = 0; i < bitCount; i++ ) {
			let bit = new CenteredEntity( new Vec2( ( i + 0.5 ) * wallUnit * 2 - width / 2, 0 ), wallUnit * 2, wallUnit );

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
				new Vec2( ( i + 0.5 ) * wallUnit * 2 - width / 2, y * wallUnit ) );
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

	},
	'hole': {

	}
};

type WaveType = keyof typeof waves;
let waveTypes: Array<WaveType> = Object.keys( waves ) as Array<WaveType>;

let availableWaves: Array<WaveType> = ['hole', 'jaw', 'barrage'];

Debug.fields['LOCK_ATK'].default = waveTypes.join( ',' );
Debug.validators['LOCK_ATK'] = Debug.arrayOfStrings( waveTypes );

// TODO: clear wall wave if boss takes damage 
export class LockBoss extends Boss {
	waves: Array<LockWall | LockJaw | LockRing | LockBarrage | LockHole> = []; 

	waveQueue: Array<WaveType> = ['hole', 'hole'];

	wallSpeed: number = 0.5;
	wallSpeedRise: number = 0.5;
	wallSpeedMax: number = 3;

	jawSpeed: number = 1;
	jawSpeedRise: number = 0.4;
	jawSpeedMax: number = 3;

	ringSpeed: number = 0.5;
	ringSpeedRise: number = 0.5;
	ringSpeedMax: number = 1;

	barrageSpeed: number = 2;
	barrageSpeedRise: number = 2;
	barrageSpeedMax: number = 12;

	holeSpeed: number = 1;
	holeSpeedRise: number = 0.2;
	holeSpeedMax: number = 2;

	invisibleWall: CenteredEntity;
	gutter: CenteredEntity;
	wait: number = 0;

	/* property overrides */

	anim = new Anim( {
		'wait': new AnimField( this, 'wait' ),
		'alpha': new AnimField( this, 'alpha', 0.1 ),
	}, new AnimFrame( {} ) );

	flavorName = 'LOCK CORE';

	health = 80;

	state: State = BossState.DEFAULT;

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	alpha: number = 0.0;
	frozen: boolean = true;

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		this.invisibleWall = new CenteredEntity( 
			new Vec2( 0, this.height / 2 + wallUnit ), fieldWidth, wallUnit );
		this.invisibleWall.material.alpha = 0.0;
		this.invisibleWall.collisionGroup = COL.ENEMY_BODY;
		this.addSub( this.invisibleWall );

		this.gutter = new Gutter( new Vec2( 0, -wallUnit * 2 + fieldHeight ), fieldWidth, wallUnit );
		this.gutter.collisionGroup = COL.ENEMY_BULLET;
		this.gutter.collisionMask = 0x00;
		this.gutter.material.alpha = 0.0;
		this.gutter.isGhost = true;
		this.addSub( this.gutter );

		this.anim.fields['gutterAlpha'] = new AnimField( this.gutter.material, 'alpha', 0.01 );

		this.maxHealth = this.getHealth();
	}

	watch( target: Vec2 ) {
		super.watch( target );

		if ( this.frozen && this.watchTarget.length() < wallUnit * 3 ) {
			this.frozen = false;

			// fade in gutter on first hit
			this.anim.pushFrame( new AnimFrame( {
				'gutterAlpha': { value: 1.0 }
			} ) )
			this.anim.pushFrame( new AnimFrame( {},
				[ { caller: this, funcName: 'createWave' } ] ) );
			this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 1.0 },
			} ) )

			this.gutter.isGhost = false;

			this.messages.push( 'Ah! A giant eye!' );
			this.messages.push( 'And those green walls are moving!' );
			this.messages.push( 'Pushing you down toward...a pit of fire!' );
		}
	}

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}

	defaultLogic() {
		if ( this.anim.isDone() && this.waves.length == 0 ) {
			this.anim.pushFrame( new AnimFrame( {},
				[ { caller: this, funcName: 'createWave' } ] ), { delay: 1000 } ); // TODO: remove frame delays?

			this.eyeAnim.clear( { withoutTag: 'exit' } );

			this.doLook();
		}

		if ( !this.watchTarget ) return;
		let watchPos = this.watchTarget.plus( this.pos );

		let gutterShape = this.getShapes().filter( x => x.parent == this.gutter )[0];
		if ( gutterShape ) {
			if ( gutterShape.contains( watchPos, 0.0, false ) ) {
				this.stopWave();
			}
		}

		// update waves
		for ( let wave of this.waves ) {
			if ( wave instanceof LockRing ) {
				let dist = wave.pos.minus( watchPos ).length();

				// if player is inside ring, close ring
			 	if ( dist < wave.exteriorRadius - wallUnit ) {
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
			}
		}

     	// end waves
		for ( let wave of this.waves ) {
			let fade = false;

			// player is at invisible wall
			if ( watchPos.y < this.invisibleWall.pos.y + this.invisibleWall.height / 2 + wallUnit ) {
				fade = true;
			}

			wave.doForAllChildren( ( entity: Entity ) => {
				if ( entity.applyTransform( new Vec2() ).y - this.pos.y > fieldHeight ) {
					entity.destructor();
				}
			} );

			// wall
			if ( wave instanceof LockWall ) {
				if ( watchPos.y < wave.pos.y - wave.height ) {
					fade = true;
				}

			// top and bottom of jaw
			} else if ( wave instanceof LockJaw ) {
				if ( watchPos.y < wave.pos.y - wave.height &&
				 	 watchPos.y < wave.bottom.applyTransform( new Vec2() ).y - wave.height ) {
					fade = true;
				}
			
			// ring
			} else if ( wave instanceof LockRing ) {
				if ( watchPos.y < wave.pos.y - fieldWidth / 2 ) {
					fade = true;
				}

			// barrage
			} else if ( wave instanceof LockBarrage ) {
				if ( watchPos.y < wave.pos.y - wave.height ) {
					fade = true;
				}

			// hole
			} else if ( wave instanceof LockHole ) {
				if ( watchPos.y < wave.pos.y - wave.height ) {
					fade = true;
				}
			}


			if ( wave.state != LockWallState.FADING && fade ) {
				wave.state = LockWallState.FADING;
				wave.anim.pushFrame( new AnimFrame( { 'alpha': { value: 0.0, expireOnReach: true } } ) );
			}	
		}
	}

	stopWave() {
		for ( let wave of this.waves ) {
			wave.anim.clear();
			wave.vel.zero();

			wave.state = LockWallState.FADING;
			wave.anim.pushFrame( new AnimFrame( { 'alpha': { value: 0.0, expireOnReach: true } } ) );
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
			else type = availableWaves[Math.floor( Math.random() * availableWaves.length )];
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
		
		} else if ( type == 'hole' ) {
			let wall = new LockHole( pos, this.holeSpeed );

			this.holeSpeed += this.holeSpeedRise;
			this.holeSpeed = Math.min( this.holeSpeed, this.holeSpeedMax );

			this.waves.push( wall );
			this.spawnEntity( wall );
		}
	}

	cull() {
		super.cull();

		cullList( this.waves );
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( this.frozen ) return;

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