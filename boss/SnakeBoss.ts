import { Anim, AnimField, PhysField, AnimFrame, AnimTarget, TurnDir } from '../lib/juego/Anim.js'
import { Angle } from '../lib/juego/Angle.js'
import { Newable } from '../lib/juego/constructors.js'
import { Entity, cullList, TransformOrder } from '../lib/juego/Entity.js'
import { Range } from '../lib/juego/Editable.js'
import { Contact } from '../lib/juego/Contact.js'
import { Material } from '../lib/juego/Material.js'
import { FuncCall } from '../lib/juego/serialization.js'  
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { Dict } from '../lib/juego/util.js'

import { CenteredEntity } from '../CenteredEntity.js'
import { COL, MILLIS_PER_FRAME } from '../collisionGroup.js'
import { Explosion } from '../Explosion.js'
import { Bullet, Gutter } from '../Bullet.js'

import * as Debug from '../Debug.js'

import { Attack, AttackReq } from './Attack.js'
import { Boss, BossState, BossFlags } from './Boss.js'
import { Switch } from './Switch.js'

let fieldWidth = 630;
let interiorWidth = 200;
let wallUnit = 20;

let attacks = [
	new Attack(
		'seek',
		[]
	),
]

let attackNames = attacks.map( x => x.name );
Debug.fields['SNAKE_ATK'].default = attackNames.join( ',' );
Debug.validators['SNAKE_ATK'] = Debug.arrayOfStrings( attackNames );

class SnakeBossBarrier extends CenteredEntity {
	altMaterial = new Material( 210, 1.0, 0.9 );

	// overrides
	material = new Material( 210, 1.0, 0.7 );
	drawWireframe = true;

	constructor( pos: Vec2, diameter: number ) {
		super( pos, diameter, diameter );
	}

	/* Entity overrides */

	getOwnShapes(): Array<Shape> {
		let shape = Shape.makeRectangle( new Vec2( -this.width / 2, -this.width / 2 ), this.width, this.width );

		shape.material = this.material;
		shape.parent = this;
		shape.hollow = true;

		for ( let i = 0; i < shape.edges.length; i++ ) {
			if ( this.altMaterial && i % 2 == 0 ) {
				shape.edges[i].material = this.altMaterial;
			}
		
			shape.normals[i].flip();
		}

		let grid = [];
		let w = this.width / 7;

		for ( let x = 0; x < 3; x++ ) {
			for ( let y = 0; y < 3; y++ ) {
				let box = Shape.makeRectangle( new Vec2( w * ( x * 2 - 2.5 ), w * ( y * 2 - 2.5 ) ), w, w );
				box.material = this.material;
				box.parent = this;

				grid.push( box );
			}
		} 

		return [shape].concat( grid );
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		for ( let shape of this.getShapes() ) {
			shape.stroke( context );
		}
	}
}

class SnakeBossSegment extends CenteredEntity {
	fuchsiaMaterial = new Material( 300, 0.5, 0.5 );
	coreMaterial = new Material( 30, 1.0, 0.5 );

	vulnerable: boolean = false;
	flash: number = 0.0;

	wait: number = 0;

	health: number = 5;

	/* property overrides */

	transformOrder = TransformOrder.ROTATE_THEN_TRANSLATE;

	material = new Material( 270, 1.0, 0.3 );
	altMaterial = new Material( 270, 1.0, 0.5 );

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', 0 ),
		'angle': new PhysField( this, 'angle', 'angleVel', 0 ),

		// thread 1
		'width': new AnimField( this, 'width', 2 ),
		'flash': new AnimField( this, 'flash', 0.1 ),
		'alpha': new AnimField( this, 'alpha', 0.1 ),
		'core-skewS': new AnimField( this.coreMaterial, 'skewS', 0.1 ),

		// thread 2
		'lum': new AnimField( this.fuchsiaMaterial, 'lum' ),

		'wait': new AnimField( this, 'wait' ),
	},
	new AnimFrame( {} ) );

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );

		this.coreMaterial.skewS = -1.0;
	}

	/* Entity overrides */

	spawnBullet() {
		for ( let j = 0; j < 2; j++ ) {
			let bullet = new Bullet( this.applyTransform( new Vec2( 0, -this.height / 2 + j * this.height ) ),
									 Vec2.fromPolar( this.angle - Math.PI / 2 + Math.PI * j, 5 ) );

			this.spawnEntity( bullet );
			bullet.collisionGroup = COL.ENEMY_BULLET;
		}
	}

	activate() {
		this.vulnerable = true;

		this.anim.pushFrame( new AnimFrame( {
			'core-skewS': { value: 0.0 }
		} ), { threadIndex: 1 } );
	}

	deactivate() {
		this.vulnerable = false;

		this.anim.pushFrame( new AnimFrame( {
			'core-skewS': { value: -1.0 }
		} ), { threadIndex: 1 } );
	}

	fire() {
		if ( this.alpha < 1.0 ) return;

		// shoot
		this.anim.pushFrame( new AnimFrame( {
			'lum': { value: 0.5 }
		}, [
			new FuncCall<typeof this.spawnBullet>( this, 'spawnBullet', [] )
		] ), { threadIndex: 2 } );

		// charge up
		this.anim.pushFrame( new AnimFrame( {
			'lum': { value: 1.0, reachOnCount: 1000 }
		} ), { threadIndex: 2 } );
	}

	getOwnShapes(): Array<Shape> {
		let shapes = [];

		let shape = Shape.makeRectangle( new Vec2( -this.width / 2, -this.height / 2 ), this.width, this.height, 2 );
		shape.material = this.material;
		shape.edges[0].material = this.coreMaterial;
		shape.edges[2].material = this.coreMaterial;
		shape.edges[3].material = this.altMaterial;
		shape.edges[4].material = this.coreMaterial;
		shape.edges[6].material = this.coreMaterial;
		shape.edges[7].material = this.altMaterial;

		shape.parent = this;

		let shape2 = Shape.makeRectangle( new Vec2( -5, -this.height / 2 - 5 ), 10, this.height + 10 );
		shape2.material = this.altMaterial;
		shape2.edges[0].material = this.fuchsiaMaterial;
		shape2.edges[2].material = this.fuchsiaMaterial;
		shape2.parent = this;

		return [shape, shape2];
	}

	explode() {
		let p = new Vec2( 0, 0 );//this.getRandomPoint();

		let explosion = new Explosion( p );
		this.addSub( explosion );

		explosion.collisionGroup = COL.ETHEREAL;
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( !this.vulnerable ) return;

			if ( this.health > 0 ) {
				this.health -= 1;
			
				if ( this.health <= 0 ) {
					// ask for removal
					this.anim.pushFrame( new AnimFrame( {}, [
						new FuncCall<typeof this.destructor>( this, 'destructor', [] ) 
					] ), { threadIndex: 1 } );

					// fade
					this.anim.pushFrame( new AnimFrame( {
						'width': { value: 0 },
					} ), { threadIndex: 1 } );

					// shrink
					this.anim.pushFrame( new AnimFrame( {
						'alpha': { value: 0.0 }
					} ), { threadIndex: 1 } );

					this.explode();
					this.explode();
				}

				this.anim.pushFrame( new AnimFrame( {
					'flash': { value: 0.0 }
				} ), { threadIndex: 1 } );

				this.anim.pushFrame( new AnimFrame( {
					'flash': { value: 0.5, overrideRate: 0 }
				} ), { threadIndex: 1 } );
			}
		}
	}

	shade() {
		let now = new Date().getTime();

		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		this.material.skewL = this.flash;
		this.altMaterial.skewL = this.flash;

		this.coreMaterial.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );

		super.shade();
	}
}

type SnakeBossFlags = BossFlags & {
	all_sides_unlocked: boolean;
	shell_shed: boolean;
}

class Vertex {
	pos: Vec2;
	neighbors: Array<number> = [];

	constructor( pos: Vec2 ) {
		this.pos = pos;
	}
}

class VertCloud {
	verts: Array<Vertex> = [];

	constructor( points: Array<Vec2>, cutoff: number ) {
		for ( let point of points ) {
			this.verts.push( new Vertex( point ) );
		}

		for ( let vert of this.verts ) {
			for ( let i = 0; i < this.verts.length; i++ ) {
				if ( this.verts[i] == vert ) continue;

				if ( vert.pos.distTo( this.verts[i].pos ) <= cutoff ) {
					vert.neighbors.push( i );
				}
			}
		}
	}

	getClosestVert( point: Vec2 ): Vertex {
		let minDist = -1;
		let result = null;

		for ( let vert of this.verts ) {
			let dist = vert.pos.distTo( point );

			if ( !result || dist < minDist ) {
				result = vert;
				minDist = dist;
			}
		}

		return result;
	}

	graphSearch( start: Vertex, end: Vertex, avoidIndices: Array<number>=[] ): Array<Vertex> {
		if ( !start || !end ) {
			throw new TypeError( 'graphSearch(): one of the waypoints is null' );
		}

		if ( start == end ) {
			return [start];
		}

		// marks for analyzed edges
		let seenVerts: Array<Vertex> = [start];
		let parents: { [ key: number ]: Vertex } = {};

		parents[0] = null;

		let rim: Array<Vertex> = [start];
		let newRim: Array<Vertex> = [];

		do {
			for ( let vert of rim ) {
				for ( let neighborIndex of vert.neighbors ) {
					if ( avoidIndices.includes( neighborIndex ) ) continue;

					let other = this.verts[neighborIndex];
					let index = seenVerts.indexOf( other );

					if ( index < 0 ) {
						seenVerts.push( other );
						index = seenVerts.length - 1;
					}

					// if id is present, vertex has already been checked
					if ( !( index in parents ) ) {
						parents[index] = vert;
						newRim.push( other );
					}

					if ( other == end ) {
						break;
					}
				}
			}

			rim = newRim;
			newRim = [];
		} while ( rim.length > 0 );

		// check for success
		let result: Array<Vertex> = [];

		if ( seenVerts.includes( end ) ) {
			let vert: Vertex = end;

			while ( vert !== null ) {
				result.push(vert);

				let index = seenVerts.indexOf( vert );
				vert = parents[index];
			}

			result = result.reverse();
		}

		return result;
	}
}

export class SnakeBoss extends Boss {
	cloud: VertCloud;
	path: Array<Vertex> = [];

	helmet: CenteredEntity;

	posHistory: Array<Vec2> = [];
	tail: Array<SnakeBossSegment> = [];
	segmentCount: number = 10;
	segmentLength: number = wallUnit * 2;

	flash: number = 0.0;

	wait: number = 0;

	speed: number = 2;
	speedIncrease: number = 0.2;

	/* property overrides */

	flags: SnakeBossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false,
		all_sides_unlocked: false,
		shell_shed: false
	};

	attacks = attacks;

	overrideAttackField = 'SNAKE_ATK';

	flavorName = 'SNAKE CORE';

	health = 10;

	material = new Material( 15, 1.0, 0.5 );

	collisionGroup = COL.LEVEL;
	collisionMask = COL.PLAYER_BULLET;

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', this.speed ),
		'alpha': new AnimField( this, 'alpha', 0.05 ),
		'wait': new AnimField( this, 'wait' ),
		'flash': new AnimField( this, 'flash' ),
		'invuln': new AnimField( this, 'invuln' ),
		'state': new AnimField( this, 'state' ),
	},
	new AnimFrame( {
		'flash': { value: 0.0 },
		'invuln': { value: false },
	} ) );

	editFields: Array<string> = this.editFields.concat( [
		'speed'
	] );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		// helmet
		this.helmet = new CenteredEntity( new Vec2(), 90, 90 );
		this.helmet.angle = Math.PI / 2;
		let helmetPoints = [new Vec2( 0, 0 )];
		for ( let i = 0; i < 9; i++ ) {
			helmetPoints.push( Vec2.fromPolar( -Math.PI * 0.9 + Math.PI * 1.8 * i / 8, 45 ) )
		}
		let helmetShape = Shape.fromPoints( helmetPoints ); 
		helmetShape.material = new Material( 300, 1.0, 0.5 );
		helmetShape.material.alpha = 0.8;
		this.helmet.presetShapes = [helmetShape];
		this.helmet.collisionGroup = COL.LEVEL;
		this.helmet.collisionMask = COL.PLAYER_BULLET;

		this.anim.fields['helmet-angle'] = new PhysField( this.helmet, 'angle', 'angleVel', 0.1, { isAngle: true } );

		this.addSub( this.helmet );

		// segments
		for ( let i = 0; i < this.segmentCount; i++ ) {
			let seg = new SnakeBossSegment( new Vec2( i * -this.segmentLength, 0 ), this.segmentLength, wallUnit / 2 );
			seg.collisionGroup = COL.LEVEL;
			seg.collisionMask = COL.PLAYER_BULLET;

			this.tail.push( seg );
			this.addSub( seg );
		}

		this.posHistory.unshift( this.pos.plus( new Vec2( 180, -180 ) ) );
		this.posHistory.unshift( this.pos.plus( new Vec2( 360, -180 ) ) );
		this.posHistory.unshift( this.pos.plus( new Vec2( 360, 0 ) ) );
		this.posHistory.unshift( this.pos.plus( new Vec2( 180, 0 ) ) );

		if ( spawn ) {
			let barrier = new SnakeBossBarrier( this.pos.plus( new Vec2( 90, 90 ) ), fieldWidth );
			this.spawnEntity( barrier );
			barrier.collisionGroup = COL.LEVEL;
			barrier.collisionMask = COL.ENEMY_BULLET;

			let points = [];
			let w = fieldWidth / 7;

			for ( let x = 0; x < 7; x++ ) {
				for ( let y = 0; y < 7; y++ ) {
					if ( x % 2 && y % 2 ) continue;

					points.push( barrier.pos.plus( new Vec2( w * -3 + w * x, w * -3 + w * y ) ) );
				}
			}

			this.cloud = new VertCloud( points, w + 10 );
		}
	}

	orientSegments() {
		let points: Array<Vec2> = [];
		let buffer = 10;
		let seekLength = this.segmentLength + buffer; // first point is on eye circumference
		let len = seekLength / 2;

		for ( let i = 1; i < this.posHistory.length; i++ ) {
			if ( points.length >= this.tail.length + 1 ) break;

			let diff = this.posHistory[i].distTo( this.posHistory[i-1] );

			if ( len + diff > seekLength ) {
				let bite = seekLength - len; // amount needed to "bite off" to complete segment

				// if the position history has a big gap between points, put multiple segments along it
				let consumed = false;

				while ( !consumed ) {
					points.push( this.posHistory[i-1].alongTo( this.posHistory[i], bite / diff ).minus( this.pos.plus( this.vel ) ) );
					
					// update seek length for next segment
					if ( points.length - 1 < this.tail.length ) {
						seekLength = this.tail[points.length-1].width + buffer;
					}

					if ( bite + seekLength < diff ) {
						bite += seekLength;
					} else {
						consumed = true;
					}
				}

				len = diff - bite;

			} else {
				len += diff;
			}
		}

		for ( let i = 0; i < this.tail.length && i + 1 < points.length; i++ ) {
			this.tail[i].anim.clear( { withTag: 'orient' } );

			this.tail[i].anim.pushFrame( new AnimFrame( {
				'pos': { value: points[i].alongTo( points[i+1], 0.5 ) },
				'angle': { value: points[i].minus( points[i+1] ).angle() }
			} ), { tag: 'orient' } );
		}
 	}

	orientHelmet() {
		if ( this.anim.isDone( [2] ) && this.vel.length() > 0.0001 ) {
			this.anim.pushFrame( new AnimFrame( { 
				'helmet-angle': { value: this.vel.angle() }
			} ), { threadIndex: 2 } )
		}
	}

	/* Entity overrides */

	cull() {
		super.cull();

		let prevLength = this.tail.length;
		cullList( this.tail );

		if ( this.tail.length < prevLength ) {
			this.speed += this.speedIncrease;
			this.anim.fields['pos'].rate = this.speed;
		}
	}

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( contact.sub instanceof SnakeBossSegment ) {
			contact.sub.hitWith( otherEntity, contact );

		} else if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			if ( this.invuln ) return;
			if ( contact.sub != this ) return; // no weak points except eye

			this.damage( 1 );
		}
	}

	/* Boss overrides */

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );

		this.orientSegments();
		this.orientHelmet();

		// sub-entities update with info from orient() methods
	}

	canEnter( attack: Attack ): boolean {
		return true;
	}

	defaultLogic() {
		/* flag checks */

		let health = this.getHealth();
		if ( health < this.flags['health'] ) {
			this.flags['current_attack_damage'] += this.flags['health'] - health;
			this.flags['health'] = health;
		}

		/* attack change */
		if ( this.anim.isDone( [0] ) ) {
			this.chooseAttack();

			// rotate
			if ( this.attack.name == 'seek' ) {
				let start = this.cloud.getClosestVert( this.pos );
				let end = this.cloud.getClosestVert( this.pos.plus( this.watchTarget ) );

				let avoidIndices = [];
				for ( let i = this.path.length - 2; i >= 0 && i < this.path.length; i++ ) {
					avoidIndices.push( this.cloud.verts.indexOf( this.path[i] ) );
				}
				for ( let i = 0; i < this.tail.length / 2; i++ ) {
					let v = this.cloud.getClosestVert( this.pos.plus( this.tail[i].pos ) );

					avoidIndices.push( this.cloud.verts.indexOf( v ) );
				}

				this.path = this.cloud.graphSearch( start, end, avoidIndices );

				if ( this.path.length < 2 ) {
					let okIndices = [];

					for ( let i = 0; i < this.cloud.verts.length; i++ ) {
						if ( avoidIndices.indexOf( i ) < 0 ) {
							okIndices.push( i );
						}
					}

					let index = Math.floor( Math.random() * okIndices.length );

					this.path = this.cloud.graphSearch( start, this.cloud.verts[index], avoidIndices );
				}

				let rev = this.path.concat();

				if ( start.pos.distTo( this.pos ) < 10 ) rev.splice( 0, 1 ); 
				rev.reverse();

				for ( let vert of rev ) {
					this.anim.pushFrame( new AnimFrame( {
						'pos': { value: vert.pos.copy() }
					} ) );
				}
			}
		}

		/* attack update */

		if ( this.attack.name == 'seek' ) {
			if ( this.anim.isDone( [3] ) ) {
				for ( let i = this.tail.length - 1; i >= 0; i-- ) {
					this.anim.pushFrame( new AnimFrame( {
						'wait': { value: 0, expireOnCount: 1000 }
					}, [
						new FuncCall<typeof this.shootSeg>( this, 'shootSeg', [i] ),
					] ), { threadIndex: 3 } );
				}				
			}
		}

		/* body */

		let vulnCount = this.tail.filter( x => x.vulnerable ).length;
		if ( this.tail.length > 0 && vulnCount < 3 ) {
			let index = Math.floor( Math.random() * this.tail.length );

			if ( !this.tail[index].vulnerable ) this.tail[index].activate();
		}

		this.posHistory.unshift( this.pos.copy() );
	}

	shootSide( even: boolean ) {
		for ( let i = 0; i < this.tail.length; i++ ) {
			if ( even && ( i % 2 ) ) continue;
			if ( !even && !( i % 2 ) ) continue;

			this.tail[i].fire();
		}
	}

	shootSeg( index: number ) {
		if ( index < 0 || index >= this.tail.length ) {
			console.warn( 'SnakeBoss.shootSeg: Index out of range (' + index + ')' );

			return;
		}

		this.tail[index].fire();
	}

	draw( context: CanvasRenderingContext2D ) {
		super.draw( context );

		context.lineWidth = 1;
		context.strokeStyle = 'white';

		for ( let vert of this.cloud.verts ) {
			for ( let neighborIndex of vert.neighbors ) {
				let nPos = this.cloud.verts[neighborIndex].pos;

				context.beginPath()
				context.moveTo( vert.pos.x, vert.pos.y );
				context.lineTo( nPos.x, nPos.y );
				context.stroke();
			}
		}

		context.lineWidth = 3;
		context.strokeStyle = 'red';

		for ( let i = 0; i < this.path.length - 1; i++ ) {
			context.beginPath()
			context.moveTo( this.path[i].pos.x, this.path[i].pos.y );
			context.lineTo( this.path[i+1].pos.x, this.path[i+1].pos.y );
			context.stroke();
		}
	}
}

export let constructors: Dict<Newable> = { 
	'SnakeBossBarrier': SnakeBossBarrier,
	'SnakeBossSegment': SnakeBossSegment,
	'SnakeBoss': SnakeBoss
}