import { Anim, AnimField, AnimFrame } from './lib/juego/Anim.js'
import { Contact } from './lib/juego/Contact.js'
import { Entity, TopLeftEntity } from './lib/juego/Entity.js'
import { EntityManager } from './lib/juego/EntityManager.js'
import { GridArea } from './lib/juego/GridArea.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Line } from './lib/juego/Line.js'
import { Material } from './lib/juego/Material.js'
import { Region } from './lib/juego/Region.js'
import { RayHit } from './lib/juego/RayHit.js'
import { Scene } from './lib/juego/Scene.js'
import { ScrollBox } from './lib/juego/ScrollBox.js'
import { Shape } from './lib/juego/Shape.js'
import { TileArray } from './lib/juego/TileArray.js'
import { Vec2 } from './lib/juego/Vec2.js'

import * as tp from './lib/toastpoint.js'

import { Boss } from './Boss.js'
import { Bullet } from './Bullet.js'
import { RandomPoly } from './CenteredEntity.js'
import { Coin } from './Coin.js'
import { COL } from './collisionGroup.js'
import { Player } from './Player.js'
import { constructors, nameMap } from './objDef.js'
import { renderFromEye, renderRays } from './render.js'

import { RollBoss, Barrier } from './RollBoss.js' 
import { LockBoss } from './LockBoss.js'

import * as Debug from './Debug.js'

type QueueFuncOptions = {
	runOnClear?: boolean;
}

class QueueFunc {
	func: () => boolean;
	runOnClear: boolean = false;

	constructor( func: () => boolean, options: QueueFuncOptions={} ) {
		if ( options.runOnClear !== undefined ) this.runOnClear = options.runOnClear;

		this.func = func;
	}
}

let MODE_GRAVITY = 0;
let MODE_SQUARE = 1;

///////////
// LEVEL //
///////////

/*
	Scene holding a player area 
*/

export class Level extends Scene {
	em: EntityManager = new EntityManager();
	grid: GridArea = new GridArea();

	// level info
	player: Player = null;
	controlMode: number = MODE_GRAVITY;
	grav: Vec2 = new Vec2( 0, 1 );
	data: any;
	
	// text box
	textBox: Entity = new TopLeftEntity( new Vec2( 0, 300 ), 400, 0 );
	textBoxHeight: number = 50;//Quant = new Quant( 0, 0, 50, 2 );

	text: string = '';
	textIndex: number = 0;
	speaker: Entity = null;

	//
	paused: boolean = false;

	tryCount: number = 0;
	updateQueue: Array<QueueFunc> = [];
	boundKeyHandler = this.keyHandler.bind(this);
	
	cursorPos: Vec2 = new Vec2( 0, 0 );
	
	sliceCount: number = 45;

	healthBar: number = 0;
	healthBarMax: number = 0;
	haloWidth: number = 40;
	oldTime: number = 0;

	ir: number = 300;
	or: number = 320;

	anim = new Anim( {
		'healthBar': new AnimField( this, 'healthBar', 3 ),
		'haloWidth': new AnimField( this, 'haloWidth', 5 ),
		'or': new AnimField( this, 'or', 40 ),
		'ir': new AnimField( this, 'ir', 40 ),
	},
	new AnimFrame( {
		'healthBar': { value: 0 },
		'haloWidth': { value: 40 },
		'or': { value: 120 },
		'ir': { value: 100}
	} ) );

	discardFields = ['em', 'textBox', 'textBoxHeight', 'text', 'textIndex', 'speaker',
					 'updateQueue', 'boundKeyHandler', 'cursorPos', 'sliceCount', 'oldTime'];
	//saveFields = ['grid', 'player', 'controlMode', 'grav', 'data', 'bossHealthMax'];

	constructor( name: string, data: any ) {
		super( name );

		this.data = data;

		this.textBox.material = new Material( 0, 0, 0.92 );
	}

	protected toJSON( toaster: tp.Toaster ): any {
		let fields = Object.keys( this );

		// never save these fields (which are lists of other fields)
		let exclude = ['editFields', 'saveFields', 'discardFields', 'entities'];

		// fields for for serialization only (exclude the old value if left in by mistake)
		exclude = exclude.concat( ['__entities'] );

		exclude = exclude.concat( this.discardFields );
		fields = fields.filter( x => !exclude.includes( x ) );

		let flat: any = {};

		tp.setMultiJSON( flat, fields, this, toaster );
		tp.setJSON( flat, '__entities', this.em.entities, toaster );

		return flat;
	}

	load(): Promise<any> {
		this.em.clear();
		this.grid = new GridArea();

		this.grid.load( this.data );
		this.begin();

		this.isLoaded = true;

		return new Promise( function(resolve, reject) {
			resolve(0);
		});
	}
	
	begin() {
		this.healthBar = 0;
		this.oldTime = 0;
		this.tryCount += 1;

		Debug.setFlags( { 'DRAW_NORMAL': this.data.drawNormal } );
		this.controlMode = this.data.controlMode;

		let pos: Vec2 = new Vec2();		

		for (let c = 0; c <= this.grid.hTiles; c++ ) {
			for (let r = 0; r <= this.grid.vTiles; r++ ) {
				let index = this.grid.spawnLayer.get( r, c );

				pos.setValues( ( c + 0.5 ) * this.grid.tileWidth, 
							   ( r + 0.5 ) * this.grid.tileHeight );

				if ( index == 2 ) {
					this.player = new Player( pos.copy() );
					this.player.collisionGroup = COL.PLAYER_BODY;
					this.player.collisionMask = COL.ENEMY_BODY | COL.ENEMY_BULLET | COL.LEVEL | COL.ITEM;
					this.em.insert( this.player );

				} else if ( index == 3 ) {
					let coin = new Coin( pos.copy() );
					coin.collisionGroup = COL.ITEM;
					coin.collisionMask = 0x00;
					this.em.insert( coin );

				} else if ( index == 4 || index == 6 ) {
					let boss: Boss;

					if ( index == 4 ) {
						boss = new RollBoss( pos.copy(), true );
					} else if ( index == 6 ) {
						boss = new LockBoss( pos.copy(), true );
					}

					if ( boss ) {
						this.em.insert( boss );

						this.healthBarMax = boss.getHealth();

						this.anim.pushFrame( new AnimFrame( {
							'healthBar': {
								value: this.healthBarMax, 
								expireOnReach: true,
								setDefault: true
							}
						} ) );
					}

				} else if ( index == 5 ) {
					let entity = new RandomPoly( pos.copy(), 3 + Math.floor( Math.random() * 6 ) );
					entity.angleVel = -0.04 + Math.random() * 0.08;
					entity.material = new Material( Math.random() * 360, 1.0, 0.5 );
					entity.collisionGroup = COL.ENEMY_BODY;
					this.em.insert( entity );

				} else if ( index == 7 ) {
					let fieldWidth = 4000;
					let fieldHeight = 4000;
					let planets: Array<Entity> = [];

					for ( let i = 0; i < 10; i++ ) {
						let overlapsAny = true;

						while ( true ) {
							let planet = new Barrier( new Vec2( Math.random() * fieldWidth - fieldWidth / 2,
																Math.random() * fieldHeight - fieldHeight / 2 ),
													  Math.random() * 400 + 100 );

							let overlapsAny = false;
							for ( let otherPlanet of planets ) {
								if ( planet.overlaps( otherPlanet, 0.0 ).length > 0 ) {
									overlapsAny = true;
									break;
								}
							}

							if ( !overlapsAny ) {
								planets.push( planet );
								break;
							}
						}
					}

					for ( let entity of planets ) {
						this.em.insert( entity );
					}
				}
			}
		}

		this.or = 320;
		this.ir = 300;

		this.anim.pushFrame( new AnimFrame( {
			'or': { value: 120, expireOnReach: true } } ) );
		this.anim.pushFrame( new AnimFrame( { 
			'ir': { value: 100, expireOnReach: true } } ) );

		let coins = this.em.entities.filter( x => x instanceof Coin );

		for (let c = 0; c <= this.grid.hTiles; c++ ) {
			for (let r = 0; r <= this.grid.vTiles; r++ ) {
				let index = this.grid.spawnLayer.get( r, c );

				pos.setValues( c * this.grid.tileWidth, r * this.grid.tileHeight );

				if ( index == -1 ) {
					let player = this.player;
					let coin = coins[0];

					let region = new Region( pos.copy(),
											 this.grid.tileWidth * 2, this.grid.tileHeight );
					if ( this.name == 'level2' ) {
						region.update = function( this: Level) {
							if ( region.overlaps( player, 0.0 ).length > 0 ) {
								this.queueText( coin, 'You found the pit! Go ahead, try again.' );
							
								region.removeThis = true;
							}
						}.bind( this );

						this.em.insert( region );
					}
				}
			}
		}

		if ( this.name == 'level2' && this.tryCount == 1 ) {
			this.queueText( coins[0], 'Check it out!' );
			this.queueText( this.player, 'Check what out?' );
			this.queueText( coins[0], 'It\'s a bottomless pit!' );
			this.queueText( this.player, 'Oh. I\'ve seen a lot of bottomless pits in my time. You just jump over.' );
			this.queueText( coins[0], 'Fine. You want something you\'ve never seen before?' );
			this.queueText( this.player, 'Please.' );
			this.queueText( coins[0], 'Okay, here goes.' );
			this.queueSliceCount( 0 );
			this.updateQueue.push( new QueueFunc( function(): boolean {
				Debug.setFlags( { 'DRAW_NORMAL': false } );

				return true;
			}, { runOnClear: true } ) );
			this.queueText( this.player, 'Agh!' );
			this.queueText( this.player, 'I\'m blind! And invisible!' );
			this.queueText( this.player, 'What happened? Where am I?' );
			this.queueSliceCount( 1 );
			this.queueText( coins[0], 'You haven\'t moved. The pit\'s still there, too.' );
			this.queueText( this.player, 'I can\'t see the pit either. All I see is a big V.' );
			this.queueText( coins[0], 'I\'m sure you\'ll find it.' );
			this.queueText( this.player, 'At the bottom of the V?' );
			this.queueText( coins[0], 'No, you\'re at the bottom of the V.' );
			this.queueText( this.player, 'That doesn\'t make any sense.' );
			this.queueText( coins[0], 'Now, don\'t go having a crisis just because you can\'t see your own body.' );
			this.queueText( coins[0], 'Perhaps I can clarify.' );
			this.queueSliceCount( 2 );
			this.queueText( coins[0], 'How\'s that?' );
			this.queueText( this.player, 'The V is now a U. Great. I remain disembodied.' );
			this.queueSliceCount( 3 );
			this.queueText( coins[0], 'All you\'ve done is changed perspective.' );
			this.queueSliceCount( 4 );
			this.queueText( this.player, 'Yeah, from a bird\'s-eye view to a rat\'s-eye view...' );
			this.queueSliceCount( 5 );
			this.queueText( this.player, 'How do I get back to how it looked before?' );
			this.queueSliceCount( 6 );
			this.queueText( coins[0], 'Wouldn\'t that be...boring? Ha ha ha.' )
			this.queueSliceCount( 7 );
			this.queueText( coins[0], 'If you must, you could start with finding all the other coins.' );
			this.queueSliceCount( 45 );
			this.queueText( coins[0], 'There\'s one now. Have at it!' );
			this.queueText( coins[0], '...and don\'t forget about the pit!' );

		} else if ( this.name == 'level2' && this.tryCount > 1 ) {
			Debug.setFlags( { 'DRAW_NORMAL': false } );
		}

		if ( this.name == 'level3' && this.tryCount == 1 ) {
			this.queueText( coins[0], 'You\'re on your own now. Good luck!' );
		}
	}

	wake() {
		document.addEventListener( "keydown", this.boundKeyHandler );
	}

	sleep() {
		document.removeEventListener( "keydown", this.boundKeyHandler );
	}

	keyHandler( e: any ) {
		if ( e.keyCode == KeyCode.Z ) {
			document.dispatchEvent( new CustomEvent( "transition", { detail: null } ) );
		}
	}

	update() {
		if ( Keyboard.keyHit( KeyCode.SPACE ) ) {
			if ( this.paused ) {
				this.paused = false;
			} else {
				this.paused = true;
			}
		}

		// paused
		if ( this.paused ) {
			this.oldTime = new Date().getTime();

			return;
		}

		// some animation is playing
		if ( this.updateQueue.length > 0 ) {
			let finished = this.updateQueue[0].func();

			if ( finished ) {
				this.updateQueue.shift();
			}

			if ( Keyboard.keyHit( KeyCode.Z ) ) {
				for ( let entry of this.updateQueue ) {
					if ( entry.runOnClear ) {
						while( !entry.func() ) {

						}
					}
				}
				this.updateQueue = [];
			}

		// regular gameplay
		} else {
			this.defaultUpdate();
		}
	}

	defaultUpdate() {
		let now = new Date().getTime();

		if ( this.oldTime == 0 ) this.oldTime = now;
		let elapsed = now - this.oldTime;

		this.oldTime = now;

		let frameStep = 1.0;//elapsed / 60;

		this.anim.update( frameStep, elapsed );

		if ( Keyboard.keyHit( KeyCode.A ) ) {
			if ( this.controlMode == MODE_GRAVITY ) {
				this.controlMode = MODE_SQUARE;
			} else {
				this.controlMode = MODE_GRAVITY;
			}
		}

		if ( this.controlMode == MODE_GRAVITY ) {
			this.player.vel.x = 0;
			if ( this.player.collideDown ) this.player.vel.y = 0;

			// left/right
			if ( Keyboard.keyHeld( KeyCode.LEFT ) && !this.player.collideLeft ) {
				this.player.vel.x = -5;
			}

			if ( Keyboard.keyHeld( KeyCode.RIGHT ) && !this.player.collideRight ) {
				this.player.vel.x = 5;
			}

			// up/down
			if ( this.player.collideDown ) {
				this.player.jumpFrames = this.player.maxJumpFrames;
			} else {
				this.player.vel.y += this.grav.y;
			}

			if ( Keyboard.keyHeld( KeyCode.UP ) && !this.player.collideUp && this.player.collideDown ) {
				this.player.jumping = true;
			}

			if ( Keyboard.keyHeld( KeyCode.UP ) && this.player.jumping && this.player.jumpFrames > 0 ) {
				this.player.vel.y = -5;
				this.player.jumpFrames -= 1;

			} else {
				this.player.jumping = false;
			}

		} else if ( this.controlMode == MODE_SQUARE ) {
			this.player.vel.setValues( 0, 0 );
			this.player.angleVel = 0;

			// left/right
			if ( Keyboard.keyHeld( KeyCode.LEFT ) ) {
				this.player.vel.add( new Vec2( -1, 0 ) );
			}

			if ( Keyboard.keyHeld( KeyCode.RIGHT ) ) {
				this.player.vel.add( new Vec2( 1, 0 ) );
			}
			
			// up/down
			if ( Keyboard.keyHeld( KeyCode.UP ) ) {
				this.player.vel.add( new Vec2( 0, -1 ) );
			}

			if ( Keyboard.keyHeld( KeyCode.DOWN ) ) {
				this.player.vel.add( new Vec2( 0, 1 ) );
			}

			this.player.vel.scale( 5 );
			this.player.vel.rotate( this.player.angle );

			if ( Keyboard.keyHeld( KeyCode.Z ) ) {
				this.player.angleVel = -0.1;
			}

			if ( Keyboard.keyHeld( KeyCode.C ) ) {
				this.player.angleVel = 0.1;
			}

			if ( Keyboard.keyHit( KeyCode.X ) ) {
				let bullet = new Bullet( 
						this.player.pos.copy().plus( new Vec2( 0, -this.player.height ) ),
						new Vec2( 0, -10 ).rotate( this.player.angle ) );
				
				bullet.material.hue = 90;

				this.player.spawnEntity( bullet );

				bullet.collisionGroup = COL.PLAYER_BULLET;
				bullet.collisionMask = 0x00;
			}
		}

		// collision
		this.em.collide( this.grid );

		// debug {
			let canvas = ( window as any ).canvas;
			let context = ( window as any ).context;

			context.clearRect( 0, 0, canvas.width, canvas.height );

			for ( let entity of this.em.entities ) {
				let shapes = entity.getShapes( 0.0 );

				for ( let shape of shapes ) {
					shape.material = new Material( 0, 0, 0.5 );
				}

				for ( let shape of shapes ) {
					shape.stroke( context );
				}
			}
		// }

		for ( let entity of this.em.entities ) {
			for ( let otherEntity of this.em.entities ) {
				if ( !entity.canBeHitBy( otherEntity ) ) continue;

				let contacts = entity.overlaps( otherEntity, frameStep );

				if ( contacts.length > 0 ) {
					// debug {
						for ( let entity of this.em.entities ) {
							let shapes = entity.getShapes( frameStep );

							for ( let shape of shapes ) {
								shape.stroke( context );
							}
						}
					//}

					entity.hitWithMultiple( otherEntity, contacts );
				}
			}

			if ( entity instanceof Boss ) {
				entity.watch( this.player.pos );
			}
		}

		let stepTotal = 0.0;
		let lastTotal = 0.0;
		this.player.blockedDirs = [];
		let contacted: Entity = null;
		let shapes = [];

		while ( stepTotal < frameStep ) {
			let step = frameStep - stepTotal;
			let solidContacts = [];

			while ( step > 0.05 ) {
				solidContacts = [];
				contacted = null;

				// TODO: rank contacts
				for ( let otherEntity of this.em.entities ) {
					if ( !this.player.canBeHitBy( otherEntity ) ) continue;

					let contacts = this.player.overlaps( otherEntity, stepTotal + step );
					
					if ( contacts.length > 0 ) {
						contacted = otherEntity;
					}

					for ( let contact of contacts ) {
						if ( contact.otherSub.collisionGroup == COL.ENEMY_BODY ) {
							 solidContacts.push( contact );
						}
					}
				}

				if ( solidContacts.length > 0) {
					step /= 2;
				} else {
					break;
				}
			}

			// debug draw {
				//context.clearRect( 0, 0, canvas.width, canvas.height );

				shapes.push( ...this.player.getShapes( stepTotal + step ) );
				if ( contacted ) shapes.push( ...contacted.getShapes( stepTotal + step ) );
				
				for ( let shape of shapes ) {
					shape.stroke( context );
				}
			// }

			for ( let contact of solidContacts ) {
				if ( contact.normal.dot( this.grav ) < 0 ) this.player.collideDown = true;

				this.player.blockedDirs.push( contact.normal.copy() );
				
				// player hits something, cancel player velocity in object direction
				let ndot = this.player.vel.dot( contact.normal );
				let before = this.player.vel.copy();

				if ( ndot < 0 ) {
					let advance = stepTotal;// - lastTotal;
					if ( advance < 0.05 ) advance = 0; // at wall, running into wall, don't move at all

					this.player.pos.add( this.player.vel.times( advance ) );
					this.player.vel.sub( contact.normal.times( ndot )).scale( 1 - advance );

					lastTotal = stepTotal; // not sure if this is necessary
				}

				// object pushes player
				let v1 = this.player.vel.unit();
				let v2 = contact.vel.unit();
				let vdot = v1.dot( v2 );
				if ( vdot < 0 ) vdot = 0;

				let push = contact.vel.copy();
				push.sub( v2.times( vdot ) );

				let ahead = this.player.pos.minus( contact.point ).dot( push ) > 0;
				if ( ahead ) {
					this.player.vel.add( push.times( frameStep - stepTotal ) );
				}
			}

			stepTotal += step;
		}

		this.em.update( frameStep, elapsed );

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Coin ) {
				if ( entity.overlaps( this.player, 0.0 ).length > 0 ) {
					entity.removeThis = true;
				}
			}

			if ( entity != this.player ) {
				entity.drawWireframe = false;

				if ( entity.overlaps( this.player, 0.0 ).length > 0 ) {
					entity.drawWireframe = true;
				}
			}
		}

		let oldCoinCount = this.em.entities.filter( x => x instanceof Coin ).length;

		this.em.cull();
		this.em.insertSpawned();

		let coins = this.em.entities.filter( x => x instanceof Coin );

		if ( coins.length == 1 && oldCoinCount > coins.length && this.name == 'level1' ) {
			this.queueText( this.player, 'Is this all there is to it?' );
			this.queueText( coins[0], 'This is just the first level. Are you bored already?' );
			this.queueText( this.player, 'Whoa! Someone else is here. And yeah, I am kind of bored. Who are you?' );
			this.queueText( coins[0], 'I\'m the last coin in this level. Touch me and I\'ll show you something really cool.' );
		}

		if ( coins.length == 1 && oldCoinCount > coins.length && this.name == 'level8' ) {
			this.queueText( coins[0], 'Wow, you\'re almost there! I\'m so proud of you. To turn yourself back, press the D key.' );
			this.updateQueue.push( new QueueFunc( function(): boolean {
				Debug.setFlags( { 'DRAW_NORMAL': false } );

				return true;
			}, { runOnClear: true } ) );
		}

		if ( coins.length == 0 && oldCoinCount > coins.length ) {
			document.dispatchEvent( new CustomEvent( "complete", {} ) );
		}

		let boundary = 400;

		for ( let entity of this.em.entities ) {
			if ( entity == this.player || entity instanceof Bullet ) {
				if ( entity.pos.x < -boundary ||
					 entity.pos.x > this.grid.hTiles * this.grid.tileWidth + boundary ||
					 entity.pos.y < -boundary ||
					 entity.pos.y > this.grid.vTiles * this.grid.tileWidth + boundary ) {

					if ( entity == this.player ) {
						document.dispatchEvent( new CustomEvent( "death", {} ) );	
					} else if ( entity instanceof Bullet ) {
						entity.removeThis = true;
					}
				}
			}
		}
	}

	updateCursor( pos: Vec2 ) {
		this.cursorPos.set( pos );
	}

	/* Events */

	openTextBoxAnim(): boolean {
		this.textBox.height += 10;

		if ( this.textBox.height >= this.textBoxHeight ||
			 Keyboard.keyHeld( KeyCode.RIGHT ) ) {
			this.textBox.height = this.textBoxHeight;

			return true;
		} else {
			return false;
		}
	}

	displayTextUpdate(): boolean {
		if ( this.textIndex < this.text.length ) {
			this.textIndex += 1;
		}

		if ( this.textIndex >= this.text.length ) {
			if ( Keyboard.keyHit( KeyCode.RIGHT ) ) {
				return true;	
			} else {
				return false;
			}
		} else {
			if ( Keyboard.keyHeld( KeyCode.RIGHT ) ) {
				this.textIndex = this.text.length;
			}

			return false;
		}		
	}

	closeTextBoxAnim(): boolean {
		this.textBox.height -= 10;

		if ( this.textBox.height <= 0 ||
			 Keyboard.keyHeld( KeyCode.RIGHT ) ) {
			this.textBox.height = 0;

			return true;
		} else {
			return false;
		}
	}

	queueText( speaker: Entity, text: string ) {
		this.updateQueue.push( new QueueFunc( function( this: Level ): boolean {
			this.textBox.height = 0;

			this.speaker = speaker;
			this.text = text;

			this.textIndex = 0;

			return true;
		}.bind( this ) ) );
		this.updateQueue.push( new QueueFunc( this.openTextBoxAnim.bind( this ) ) );
		this.updateQueue.push( new QueueFunc( this.displayTextUpdate.bind( this ) ) );
		this.updateQueue.push( new QueueFunc( function( this: Level ): boolean {
			this.speaker = null;
			this.text = '';

			return true;
		}.bind( this ), { runOnClear: true } ) );
		this.updateQueue.push( new QueueFunc( 
			this.closeTextBoxAnim.bind( this ),
			{ runOnClear: true } ) );
	}

	queueSliceCount( count: number ) {
		this.updateQueue.push( new QueueFunc( function( this: Level ): boolean {
			this.sliceCount = count;

			return true;
		}.bind( this ) ) );
	}

	/* Drawing */

	draw( context: CanvasRenderingContext2D ) {

		/* Prepare Scene */

		let origin = this.player.pos.copy();

		let ir = this.ir;
		let or = this.or;

		let count = this.sliceCount;
		let slices: Array<number> = [];
		let cursorDir = this.cursorPos.minus( new Vec2( 200, 200 ) ).normalize();
		let defaultSlice = Math.PI * 2 / count;

		for ( let i = 0; i < count; i++ ) {
			let angle = defaultSlice * i;

			let dir = new Vec2( Math.cos( angle ), Math.sin( angle ) );

			if ( true || dir.dot( cursorDir ) > 0.7 ) {
				slices.push( defaultSlice / 4 );
				slices.push( defaultSlice / 4 );
				slices.push( defaultSlice / 4 );
				slices.push( defaultSlice / 4 );				
			} else if ( dir.dot( cursorDir ) > 0 ) {
				slices.push( defaultSlice / 2 );
				slices.push( defaultSlice / 2 );
			} else {
				slices.push( defaultSlice );
			}
		}

		let angle = 0;

		let shapes = this.grid.shapes.concat();
		for ( let entity of this.em.entities ) {
			if ( entity != this.player ) {
				shapes.push( ...entity.getShapes( 0.0 ) );
			}
		}

		/* Draw Scene */

		// draw 2D
		this.em.shade();

		if ( Debug.flags.DRAW_NORMAL ) {
			context.save();
				context.translate( -this.player.pos.x + 200, -this.player.pos.y + 200 );
				this.grid.draw( context );	
				this.em.draw( context );
			
				if ( Debug.flags.DRAW_RAYS ) {
					renderRays( context, shapes, origin, slices );
				}
			context.restore();

		// draw from eye
		} else {
			context.save();
				context.translate( 200, 200 );
				context.rotate( -this.player.angle );

				renderFromEye( context, shapes, origin, slices, or, ir );

				ir = or + 2;
				or = ir + this.haloWidth;

				let gradient = context.createRadialGradient(0, 0, ir, 0, 0, or);
				gradient.addColorStop(0, "hsl( 210, 100%, 90% )");
				gradient.addColorStop(1, "white");

				let boss = this.em.entities.filter( x => x instanceof Boss )[0];

				if ( boss && boss instanceof Boss ) {
					this.anim.stack[0].targets['healthBar'].value = boss.getHealth();

					if ( this.healthBarMax > 0 ) {
						let segments = this.healthBarMax;
						let slice = Math.PI * 2 / segments;

						let sweep = this.healthBar * slice;
						context.fillStyle = gradient;
						
						for ( let angle = -Math.PI / 2; angle < -Math.PI / 2 + sweep; angle += slice ) {
							context.beginPath();
							context.moveTo( Math.cos( angle ) * ir, Math.sin( angle ) * ir );
							context.lineTo( Math.cos( angle ) * or, Math.sin( angle ) * or );
							context.lineTo( Math.cos( angle + slice ) * or, Math.sin( angle + slice ) * or );
							context.lineTo( Math.cos( angle + slice ) * ir, Math.sin( angle + slice ) * ir );
							context.fill();
						}
					}
				}
			context.restore();
		}

		/* Text Box */

		this.textBox.draw( context );

		if ( this.text != '' ) {
			if ( this.speaker !== null && this.textBox.height > 10 ) {
				context.fillStyle = this.speaker.material.getFillStyle();
				context.fillRect( this.textBox.pos.x + 5,
								  this.textBox.pos.y + 5,
								  40,
								  this.textBox.height - 10 );
			}

			context.font = "10px Arial";
			context.fillStyle = 'black';

			let y = 15;
			let lineWidth = 50;
			let word = '';
			let line = '';
			let lineStart = 0;

			for ( let i = 0; i < this.textIndex; i++ ) {
				word += this.text[i];

				if ( this.text[i] == ' ' ) {
					line += word;
					word = '';
				}

				// on spaces, decide whether to print the line and move to the next one
				let index = this.text.indexOf( ' ', i+1 );
				if ( index < 0 ) index = this.text.length;
				let crossed = index > lineStart + lineWidth;

				if ( i == this.textIndex - 1 ) {
					context.fillText( line + word, 100, this.textBox.pos.y + y );

				} else if ( crossed ) {
					lineStart += line.length;

					context.fillText( line, 100, this.textBox.pos.y + y );
					line = '';
					y += 15;
				}
			}
		}

		if ( this.updateQueue.length > 0 ) {
			context.fillStyle = 'black';
			context.fillRect( 400 - 36,
				   			  400 - 16,
				   			  32, 13 );
			context.fillStyle = 'white';
			context.fillText( 'Z: skip', 400 - 35,
				   			  400 - 6 );
		}

		/* Pause Overlay */
		if ( this.paused ) {
			context.fillStyle = 'hsl( 0, 0%, 90%)';
			context.font = "24px Arial";

			let text = 'P A U S E';
			let meas = context.measureText( text );
			let w = meas.width;
			let h = meas.actualBoundingBoxAscent + meas.actualBoundingBoxDescent;
			
			context.fillText( text, 200 - w / 2, 200 + h / 2 );
		}
	}
}