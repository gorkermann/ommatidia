import { Anim, AnimField, AnimFrame } from './lib/juego/Anim.js'
import { solveCollisionsFor } from './lib/juego/collisionSolver.js'
import { Camera } from './lib/juego/Camera.js'
import { Contact } from './lib/juego/Contact.js'
import { Entity, TopLeftEntity, cullList } from './lib/juego/Entity.js'
import { GridArea } from './lib/juego/GridArea.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Line } from './lib/juego/Line.js'
import { Material } from './lib/juego/Material.js'
import { constructors, nameMap } from './lib/juego/constructors.js'
import { RayHit } from './lib/juego/RayHit.js'
import { Scene } from './lib/juego/Scene.js'
import { ScrollBox } from './lib/juego/ScrollBox.js'
import { Shape } from './lib/juego/Shape.js'
import { Sound } from './lib/juego/Sound.js'
import { TileArray } from './lib/juego/TileArray.js'
import { Vec2 } from './lib/juego/Vec2.js'

import * as tp from './lib/toastpoint.js'

import { Boss } from './boss/Boss.js'
import { RollBoss, Barrier } from './boss/RollBoss.js' 
import { LockBoss, LockWall } from './boss/LockBoss.js'
import { ShellBoss } from './boss/ShellBoss.js'
import { SwitchBoss } from './boss/SwitchBoss.js'

import { Bullet, PlayerBullet } from './Bullet.js'
import { CenteredEntity, RandomPoly } from './CenteredEntity.js'
import { Coin } from './Coin.js'
import { COL, MILLIS_PER_FRAME, REWIND_SECS } from './collisionGroup.js'
import { Player } from './Player.js'
import { shapecast, renderFromEye, renderRays, whiteText, vals } from './render.js'

import { Orbiter, Blocker, Elevator, Tumbler, Door } from './TutorialEntity.js'

import * as Debug from './Debug.js'

let MODE_GRAVITY = 0;
let MODE_SQUARE = 1;
let MODE_FREE = 2;

///////////
// LEVEL //
///////////

/*
	Scene holding a player area 
*/

/*let tempCanvas = document.createElement( 'canvas' ) as HTMLCanvasElement;
tempCanvas.width = 400;
tempCanvas.height = 400;*/

let DEFAULT_WIDTH = 400;

let deathReplayScale = 4.0;

type ReplayImage = {
	image: ImageData,
	playerPos: Vec2
}

enum LevelState {
	DEFAULT = 0,
	DEATH_REPLAY,
	DEATH_MENU,
	SUCCESS_MENU,
}

let playerBulletMaterial = new Material( 45, 0.0, 1.0 );
playerBulletMaterial.alpha = 0.3;

let playerMaterial = new Material( 0, 0, 1.0 );

let optionPanel = document.getElementById( 'optionpanel' ) as HTMLDivElement;

export class Level extends Scene {
	grid: GridArea = new GridArea();

	// level info
	player: Player = null;
	controlMode: number = MODE_GRAVITY;
	grav: Vec2 = new Vec2( 0, 1 );
	data: any;
	
	// text box
	textBox: Entity = new TopLeftEntity( new Vec2( 0, 300 ), DEFAULT_WIDTH, 0 );
	textBoxHeight: number = 50;

	text: string = '';
	textIndex: number = 0;
	speaker: Entity = null;

	//
	paused: boolean = false;

	tryCount: number = 0;
	
	cursorPos: Vec2 = new Vec2( 0, 0 );
	
	sliceCount: number = 360;

	healthBar: number = 0;
	healthBarMax: number = 0;
	haloWidth: number = 40;

	oldTime: number = 0;
	elapsedTotal: number = 0;

	ir: number = 300;
	or: number = 320;

	state: LevelState = LevelState.DEFAULT;

	replayImages: Array<ReplayImage> = [];
	replayCount: number = 10;
	replayIndex: number = 0;
	replayAlpha: number = 1.0;

	newMsg: string = '';
	messageQueue: Array<string> = [];

	sounds: Array<Sound> = [];

	messageAnim = new Anim( {
		'newMsg': new AnimField( this, 'newMsg', 1 )
	},
	new AnimFrame( {

	} ) ); 

	anim = new Anim( {
		'healthBar': new AnimField( this, 'healthBar', 3 ),
		'haloWidth': new AnimField( this, 'haloWidth', 5 ),
		'or': new AnimField( this, 'or', 40 ),
		'ir': new AnimField( this, 'ir', 40 ),
		'replayIndex': new AnimField( this, 'replayIndex', 1 ),
		'replayAlpha': new AnimField( this, 'replayAlpha', 0.1 ),
		'state': new AnimField( this, 'state', 0 ),
	},
	new AnimFrame( {
		'healthBar': { value: 0 },
		'haloWidth': { value: 40 },
		'or': { value: 120 },
		'ir': { value: 100},
		'replayAlpha': { value: 1.0 }
	} ) );

	discardFields: Array<string> = ['em', 'textBox', 'textBoxHeight', 'text', 'textIndex', 'speaker',
					 'updateQueue', 'boundKeyHandler', 'cursorPos', 'sliceCount', 'oldTime',
					 'replayImages', 'replayCount', 'replayIndex', 'replayAlpha'];
	//saveFields = ['grid', 'player', 'controlMode', 'grav', 'data', 'bossHealthMax'];

	constructor( name: string, data: any ) {
		super( name );

		this.data = data;

		this.textBox.material = new Material( 0, 0, 0.92 );
	}

	protected toToast( toaster: tp.Toaster ): any {
		let fields = Object.keys( this );

		// never save these fields (which are lists of other fields)
		let exclude = ['editFields', 'saveFields', 'discardFields']

		// fields for for serialization only (exclude the old value if left in by mistake)
		exclude = exclude.concat( ['entities', '__entities'] );

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

		this.tryCount += 1;

		Debug.setFlags( { 'DRAW_NORMAL': this.data.drawNormal } );
		this.controlMode = this.data.controlMode;	

		let gridEnt = new Entity( new Vec2( 0, 0 ), 0, 0 );
		gridEnt.isGhost = true;
		gridEnt.collisionGroup = COL.LEVEL;

		for (let c = 0; c <= this.grid.hTiles; c++ ) {
			for (let r = 0; r <= this.grid.vTiles; r++ ) {
				let index = this.grid.collisionLayer.get( r, c );

				if ( index == 1 ) {
					let block = new CenteredEntity(
									new Vec2( c * this.grid.tileWidth, r * this.grid.tileHeight ),
									this.grid.tileWidth,
									this.grid.tileHeight );

					block.material = new Material( this.data.hue, 1.0, 0.3 );
					if ( Debug.flags.LEVEL_ALT_MAT ) block.altMaterial = new Material( this.data.hue, 1.0, 0.5 );
					gridEnt.addSub( block );

				} else if ( index == 2 ) {
					let block = new CenteredEntity(
									new Vec2( c * this.grid.tileWidth, r * this.grid.tileHeight ),
									this.grid.tileWidth,
									this.grid.tileHeight );

					block.material = new Material( this.data.hue + 30, 1.0, 0.3 );
					if ( Debug.flags.LEVEL_ALT_MAT ) block.altMaterial = new Material( this.data.hue + 30, 1.0, 0.5 );
					gridEnt.addSub( block );
				}
			}
		}

		this.em.insert( gridEnt );

		let pos: Vec2 = new Vec2();	

		for ( let c = 0; c <= this.grid.hTiles; c++ ) {
			for ( let r = 0; r <= this.grid.vTiles; r++ ) {
				let index = this.grid.spawnLayer.get( r, c );

				pos.setValues( ( c + 0.0 ) * this.grid.tileWidth, 
							   ( r + 0.0 ) * this.grid.tileHeight );

				if ( index == 2 ) {
					this.player = new Player( pos.copy() );
					this.player.collisionGroup = COL.PLAYER_BODY;
					this.player.collisionMask = COL.ENEMY_BODY | COL.ENEMY_BULLET | COL.LEVEL | COL.ITEM;
					this.player.material = playerMaterial.copy();
					this.em.insert( this.player );

				} else if ( index == 3 ) {
					let coin = new Coin( pos.copy() );
					coin.collisionGroup = COL.ITEM;
					coin.collisionMask = 0x00;
					this.em.insert( coin );

				} else if ( index == 4 || index == 6 || index == 16 || index == 17 ) {
					let boss: Boss;

					if ( index == 4 ) {
						boss = new RollBoss( pos.copy(), true );
					} else if ( index == 6 ) {
						boss = new LockBoss( pos.copy(), true );
					} else if ( index == 16 ) {
						boss = new ShellBoss( pos.copy(), true );
					} else if ( index == 17 ) {
						boss = new SwitchBoss( pos.copy(), true );
					}


					if ( boss ) {
						this.em.insert( boss );

						this.healthBarMax = boss.getHealth();

						while ( boss.messages.length > 0 ) {
							this.messageAnim.pushFrame( new AnimFrame( {
								'newMsg': { value: boss.messages.pop(), expireOnReach: true }
							} ) );
						}

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

					this.em.insertList( planets );
				} else if ( index == 10 ) {
					let entity = new Orbiter( pos.plus( new Vec2( this.grid.tileWidth, this.grid.tileHeight ) ), this.grid.tileWidth );
					this.em.insert( entity );

				} else if ( index == 11 ) {
					let entity = new LockWall( pos.plus( new Vec2( this.grid.tileWidth / 2, 0 ) ), 0 );
					entity.collisionGroup = COL.LEVEL;
					this.em.insert( entity );

				} else if ( index == 12 ) {
					let entity = new Blocker( pos.copy() );
					this.em.insert( entity );

				} else if ( index == 13 ) {
					let entity = new Tumbler( pos.copy() );
					this.em.insert( entity );

				} else if ( index == 14 ) {
					let entity = new Door( pos.copy(), this.data.width * this.grid.tileWidth, 3 * this.grid.tileWidth );
					entity.collisionGroup = COL.LEVEL;
					this.em.insert( entity );

				} else if ( index == 15 ) {
					let entity = new Elevator( pos.copy(), this.grid.tileWidth );
					this.em.insert( entity );
				}
			}
		}

		this.or = 320;
		this.ir = 300;

		this.anim.pushFrame( new AnimFrame( {
			'or': { value: 120, expireOnReach: true } } ) );
		this.anim.pushFrame( new AnimFrame( { 
			'ir': { value: 100, expireOnReach: true } } ) );

		return new Promise( function(resolve, reject) {
			resolve(0);
		});
	}

	postMessage( msg: string ) {
		this.messageQueue.unshift( msg );
		this.messageQueue = this.messageQueue.slice( 0, 2 );
	}

	update() {
		let now = new Date().getTime();

		if ( this.oldTime == 0 ) this.oldTime = now;
		let elapsed = now - this.oldTime;
		this.oldTime = now;

		let frameStep = 1.0;//elapsed / 60;

		if ( this.state != LevelState.DEFAULT ) this.paused = false;

		if ( !this.paused ) {
			this.anim.update( frameStep, elapsed );
			this.messageAnim.update( frameStep, elapsed );
		}

		if ( this.state == LevelState.DEATH_REPLAY ) {
			// do nothing, anim only

		} else if ( this.state == LevelState.DEATH_MENU ) {
			if ( Keyboard.keyHit( KeyCode.R ) ) document.dispatchEvent( new CustomEvent( 'restart' ) );
			if ( Keyboard.keyHit( KeyCode.Z ) ) document.dispatchEvent( new CustomEvent( 'rewind' ) );

			if ( Keyboard.keyHit( KeyCode.LEFT ) ) this.replayIndex -= 1;
			if ( Keyboard.keyHit( KeyCode.RIGHT ) ) this.replayIndex += 1;

			if ( this.replayIndex < 0 ) this.replayIndex = 0;
			if ( this.replayIndex > this.replayImages.length - 1 ) this.replayIndex = this.replayImages.length - 1;

		} else if ( this.state == LevelState.SUCCESS_MENU ) {
			if ( Keyboard.keyHit( KeyCode.Z ) ) document.dispatchEvent( new CustomEvent( 'complete' ) );

		} else {
			if ( Keyboard.keyHit( KeyCode.SPACE ) ) {
				if ( this.paused ) {
					this.paused = false;
					optionPanel.classList.add( 'hidden' );

					for ( let sound of this.sounds ) {
					//	sound.play();
					}
				} else {
					this.paused = true;
					optionPanel.classList.remove( 'hidden' );

					for ( let sound of this.sounds ) {
					//	sound.pause();
					}
				}
			}

			if ( this.paused ) {
				this.oldTime = new Date().getTime();
			} else {
				this.defaultUpdate( frameStep, elapsed );
			}
		}
	}

	updateSounds() {
		for ( let entity of this.em.entities ) {
			if ( !( entity instanceof Boss )) continue;

			for ( let source of entity.sounds ) {
				this.updateSound( source );
			}
		}

		for ( let sound of this.sounds ) {
			this.updateSound( sound );
		}
	}

	updateSound( source: Sound ) {
		let dist = 0;

		if ( source.pos ) {
			dist = this.player.pos.distTo( source.pos );
		}

		let vol = source.distScale / ( dist ** 2 + 1 );
		source.audio.volume = Math.min( vol, 1.0 );

		let atStart = source.audio.currentTime == 0 || source.audio.ended;

		if ( atStart && source.count > 0 ) {
			source.audio.play();

			if ( !source.audio.loop ) source.count -= 1;
		}
	}

	defaultUpdate( frameStep: number, elapsed: number ) {
		this.elapsedTotal += elapsed;

		this.updateSounds();

		if ( Keyboard.keyHit( KeyCode.A ) ) {
			if ( this.controlMode == MODE_GRAVITY ) {
				this.controlMode = MODE_SQUARE;
			} else {
				this.controlMode = MODE_GRAVITY;
			}
		}

		if ( this.controlMode == MODE_GRAVITY ) {
			/*this.player.vel.x = 0;
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

			this.player.vel.y += this.grav.y;*/

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

			if ( Keyboard.getHits( KeyCode.X ) > 0 ) {
				let bullet = new PlayerBullet( 
						this.player.pos.copy().plus( new Vec2( 0, 0 ) ),
						new Vec2( 0, -10 ).rotate( this.player.angle ),
						playerBulletMaterial.copy() );

				this.player.spawnEntity( bullet );

				bullet.collisionGroup = COL.PLAYER_BULLET;
				bullet.collisionMask = 0x00;

				this.sounds.push( new Sound( './sfx/player_laser.wav' ) );
			}

		} else if ( this.controlMode == MODE_FREE ) {
			if ( Keyboard.keyHeld( KeyCode.Z ) ) {
				this.player.angleVel = -0.1;
			}

			if ( Keyboard.keyHeld( KeyCode.C ) ) {
				this.player.angleVel = 0.1;
			}
		}

		// insert player bullets
		this.em.insertSpawned();

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

		let treeGroup: Array<number> = this.em.entities.map( x => x.treeCollisionGroup() );
		let treeMask: Array<number> = this.em.entities.map( x => x.treeCollisionMask() );

		for ( let i = 0; i < this.em.entities.length; i++ ) {
			let entity = this.em.entities[i];

			for ( let j = 0; j < this.em.entities.length; j++ ) {
				if ( i == j ) continue;
				if ( ( treeMask[i] & treeGroup[j] ) == 0 ) continue;

				let otherEntity = this.em.entities[j];
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
				while ( entity.messages.length > 0 ) {
					this.messageAnim.pushFrame( new AnimFrame( {
						'newMsg': { value: entity.messages.pop(), expireOnReach: true }
					} ) );
				}
			}
		}

		for ( let entity of this.em.entities ) {
			if ( entity.isPliant ) {
				solveCollisionsFor( entity, this.em.entities, COL.LEVEL, frameStep );
			}
		}

		let result = solveCollisionsFor( this.player, this.em.entities, COL.ENEMY_BODY | COL.LEVEL, frameStep );

		this.em.advance( frameStep );
		for ( let entity of this.em.entities ) {
			entity.watch( this.player.pos );
		}

		// no position changes from here on (animate only sets velocities)

		this.em.animate( frameStep, elapsed );
		this.em.update();

		if ( this.player.health <= 0 || result.crushed ) {
			if ( result.crushed ) {
				this.player.causeOfDeath = 'You have been crushed by the ' + result.crusher.flavorName;
			}
		
			this.killPlayer();
		}

		this.checkForSuccess();

		this.em.insertSpawned();
		this.em.cull();

		let boundary = 400;

		for ( let entity of this.em.entities ) {
			if ( entity == this.player || entity instanceof Bullet ) {
				if ( entity.pos.x < -boundary ||
					 entity.pos.x > this.grid.hTiles * this.grid.tileWidth + boundary ||
					 entity.pos.y < -boundary ||
					 entity.pos.y > this.grid.vTiles * this.grid.tileWidth + boundary ) {

					if ( entity == this.player ) {
						document.dispatchEvent( new CustomEvent( 'death', {} ) );
						
					} else if ( entity instanceof Bullet ) {
						entity.removeThis = true;
					}
				}
			}
		}
	}

	killPlayer() {
		this.replayIndex = 0;
		this.replayAlpha = 0.0;

		this.anim.clear();

		this.messageAnim.pushFrame( new AnimFrame( {
			'newMsg': { value: 'Press Z to go back ' + REWIND_SECS + ' seconds or R to restart level\n', expireOnReach: true }
		} ) );

		this.messageAnim.pushFrame( new AnimFrame( {
			'newMsg': { value: this.player.causeOfDeath + '\n', expireOnReach: true }
		} ) );

		// change state
		this.anim.pushFrame( new AnimFrame( {
			'state': { value: LevelState.DEATH_MENU, expireOnReach: true }
		} ) );

		if ( Debug.flags.SHOW_DEATH ) {
			// fade out
			/*this.anim.pushFrame( new AnimFrame( {
				'replayAlpha': { value: 0.0, expireOnReach: true } 
			} ) );*/

			// wait
			this.anim.pushFrame( new AnimFrame( {
				'replayIndex': { value: this.replayImages.length - 1, expireOnCount: 1000 } 
			} ) );

			// replay death
			for ( let i = this.replayImages.length - 1; i >= 0; i-- ) {
				this.anim.pushFrame( new AnimFrame( {
					'replayIndex': { value: i, expireOnCount: MILLIS_PER_FRAME * 2 } 
				} ) );
			}

			// fade in
			this.anim.pushFrame( new AnimFrame( {
				'replayAlpha': { value: 1.0, expireOnReach: true } 
			} ) );

			// change state
			this.anim.pushFrame( new AnimFrame( {
				'state': { value: LevelState.DEATH_REPLAY, expireOnReach: true }
			} ) );
		}
	}

	checkForSuccess() {
		if ( this.state != LevelState.DEFAULT ) return;

		let success = true;
		let defeatedNames = [];

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Boss ) {
				if ( entity.preventSuccess() ) {
					success = false;
				} else {
					defeatedNames.push( entity.flavorName );
				}
			}

			if ( entity instanceof Coin ) {
				success = false;
			}
		}

		if ( success ) {
			if ( defeatedNames.length > 0 ) {
				this.anim.clear();

				this.messageAnim.pushFrame( new AnimFrame( {
					'newMsg': { value: 'Press Z to proceed\n', expireOnReach: true }
				} ) );

				this.messageAnim.pushFrame( new AnimFrame( {
					'newMsg': { value: 'You have defeated the ' + defeatedNames.join( ', ' ) + '\n', expireOnReach: true }
				} ) );

				this.anim.pushFrame( new AnimFrame( {
					'state': { value: LevelState.SUCCESS_MENU, expireOnReach: true }
				} ) );

			} else {
				document.dispatchEvent( new CustomEvent( 'complete' ) );
			}
		}
	}

	getShapes(): Array<Shape> {
		let shapes = [];

		for ( let entity of this.em.entities ) {
			shapes.push( ...entity.getShapes( 0.0 ) );
		}

		return shapes;
	}

	pickFromEye( dir: Vec2 ): Array<Entity> {
		let shapes = this.getShapes();
		let hits = shapecast( Line.fromPoints( this.player.pos.copy(), this.player.pos.plus( dir ) ), shapes );

		if ( hits.length > 0 ) {
			return [hits[0].shape.parent];
		}

		return [];
	}

	/* Drawing */

	draw( context: CanvasRenderingContext2D ) {
		this.camera.pos.set( this.player.pos );

		if ( this.state == LevelState.DEATH_REPLAY ) {
			this.deathDraw( context );
			this.defaultDraw( context );

		} else if ( this.state == LevelState.DEATH_MENU ) {
			this.deathDraw( context );
			this.defaultDraw( context );

		} else {
			this.em.shade();

			if ( !this.paused ) {
				this.appendReplayFrame( context );
			}

			this.defaultDraw( context );
			this.drawTextboxOverlay( context );

			if ( this.paused ) {
				this.drawPauseOverlay( context );
			}
		}

		if ( this.newMsg.indexOf( '\n' ) >= 0 ) {
			this.postMessage( this.newMsg );
			this.newMsg = '';
		}

		let y = this.camera.viewportH - 20;
		if ( this.newMsg.length > 0 ) {
			whiteText( context, this.newMsg, 4, y );
			y -= 20;
		}

		for ( let msg of this.messageQueue ) {
			whiteText( context, msg, 4, y );
			y -= 20;
		}
	}

	appendReplayFrame( context: CanvasRenderingContext2D ) {
		context.save();
			context.translate( this.camera.viewportW / 2, this.camera.viewportH / 2 );
			context.scale( deathReplayScale, deathReplayScale ); // option 1
			context.translate( -this.player.pos.x, -this.player.pos.y );

			for ( let entity of this.em.entities ) {
				let shapes = entity.getShapes( 0.0 );

				context.globalAlpha = 0.3;
				for ( let shape of shapes ) {
					if ( shape.hollow ) continue;

					//shape.fill( context );
				}
				context.globalAlpha = 1.0;

				for ( let shape of shapes ) {
					shape.stroke( context );
				}
			}
		context.restore();

		this.replayImages.push( {
			image: context.getImageData( 0, 0, this.camera.viewportW, this.camera.viewportH ),
			playerPos: this.player.pos.copy()
		} );

		if ( this.replayImages.length > this.replayCount ) {
			this.replayImages = this.replayImages.slice( -this.replayCount );
		}

		context.clearRect( 0, 0, this.camera.viewportW, this.camera.viewportH );

		let ir = this.ir * this.camera.viewportW / 400;

		this.camera.moveContext( context );
			context.globalCompositeOperation = 'destination-in';
			context.fillStyle = 'white';
			context.beginPath();
			context.arc( 0, 0, ir, 0, Math.PI * 2 );
			context.fill();
			context.globalCompositeOperation = 'source-over';
		this.camera.unMoveContext( context );
	}

	drawSpherical( context: CanvasRenderingContext2D, camera: Camera=this.camera ) {
		let ir = this.ir * camera.viewportW / 400;

		let shapes = this.getShapes();

		context.save();
			context.translate( camera.viewportW / 2, camera.viewportH / 2 );
			context.scale( 1.0, 1.0 );
			context.translate( -this.player.pos.x, -this.player.pos.y );

			for ( let shape of shapes ) {
				shape.sphericalStroke( context, this.player.pos, ir, vals.lens.val );
			}
		context.restore();
	}

	defaultDraw( context: CanvasRenderingContext2D, camera: Camera=this.camera ) {

		/* Prepare Scene */

		let origin = this.player.pos.copy();

		let ir = this.ir * camera.viewportW / 400;
		let or = this.or * camera.viewportW / 400;
		let haloW = this.haloWidth * camera.viewportW / 400;

		let slices: Array<number> = [];
		let defaultSlice = Math.PI * 2 / this.sliceCount;

		for ( let i = 0; i < this.sliceCount; i++ ) {
			slices.push( defaultSlice );
		}

		let shapes = this.getShapes();

		/* Draw Scene */

		// draw 2D
		if ( Debug.flags.DRAW_NORMAL ) {
			this.camera.moveContext( context );
				this.em.draw( context );
			
				if ( Debug.flags.DRAW_RAYS ) {
					renderRays( context, shapes, origin, slices );
				}
			this.camera.unMoveContext( context );

		// draw from eye
		} else {

			if ( Debug.flags.DRAW_SPHERICAL ) {
				this.drawSpherical( context, camera );
			}

			if ( Debug.flags.DRAW_FROM_EYE ) {
				let shapes = [];

				for ( let entity of this.em.entities ) {
					if ( entity == this.player ) continue;

					shapes.push( ...entity.getShapes( 0.0 ) );
				}

				context.save();
					context.translate( this.camera.viewportW / 2, this.camera.viewportH / 2 );

					renderFromEye( context, shapes, origin, this.player.vel, slices, or, ir );

					ir = or + 2;
					or = ir + this.haloWidth;

					let gradient = context.createRadialGradient(0, 0, ir, 0, 0, or);
					gradient.addColorStop(0, 'hsl( 210, 100%, 90% )');
					gradient.addColorStop(1, 'hsla( 0, 0%, 100%, 0% )');

					let boss = this.em.entities.filter( x => x instanceof Boss )[0];

					if ( boss && boss instanceof Boss ) {
						this.anim.default.targets['healthBar'].value = boss.getHealth();

						if ( this.healthBarMax > 0 ) {
							let segments = this.healthBarMax;
							let slice = Math.PI * 2 / segments;

							let sweep = this.healthBar * slice;
							context.fillStyle = gradient;
							
							/*for ( let angle = -Math.PI / 2; angle < -Math.PI / 2 + sweep; angle += slice ) {
								context.beginPath();
								context.moveTo( Math.cos( angle ) * ir, Math.sin( angle ) * ir );
								context.lineTo( Math.cos( angle ) * or, Math.sin( angle ) * or );
								context.lineTo( Math.cos( angle + slice * 1.16 ) * or, Math.sin( angle + slice * 1.16 ) * or );
								context.lineTo( Math.cos( angle + slice * 1.16 ) * ir, Math.sin( angle + slice * 1.16 ) * ir );
								context.fill();
							}*/
							context.beginPath();
							context.moveTo( Math.cos( -Math.PI / 2 ) * ir, Math.sin( -Math.PI / 2 ) * ir );
							context.lineTo( Math.cos( -Math.PI / 2 ) * or, Math.sin( -Math.PI / 2 ) * or );
							context.arc( 0, 0, or, -Math.PI / 2, -Math.PI / 2 + sweep );
							context.lineTo( Math.cos( -Math.PI / 2 + sweep ) * ir, Math.sin( -Math.PI / 2 + sweep ) * ir );
							context.arc( 0, 0, ir, -Math.PI / 2 + sweep, -Math.PI / 2, true );
							context.fill();
						}
					}
				context.restore();
			}
		}
	}

	drawTextboxOverlay( context: CanvasRenderingContext2D ) {
		this.textBox.draw( context );

		if ( this.text != '' ) {
			if ( this.speaker !== null && this.textBox.height > 10 ) {
				context.fillStyle = this.speaker.material.getFillStyle();
				context.fillRect( this.textBox.pos.x + 5,
								  this.textBox.pos.y + 5,
								  40,
								  this.textBox.height - 10 );
			}

			context.font = '10px Arial';
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

		/*if ( this.updateQueue.length > 0 ) {
			context.fillStyle = 'black';
			context.fillRect( 400 - 36,
				   			  400 - 16,
				   			  32, 13 );
			context.fillStyle = 'white';
			context.fillText( 'Z: skip', 400 - 35,
				   			  400 - 6 );
		}*/	
	}

	drawPauseOverlay( context: CanvasRenderingContext2D ) {
		context.fillStyle = 'hsl( 0, 0%, 90%)';
		context.font = '24px Arial';

		let text = 'P A U S E';
		let meas = context.measureText( text );
		let w = meas.width;
		let h = meas.actualBoundingBoxAscent + meas.actualBoundingBoxDescent;
		
		context.fillText( text, this.camera.viewportW / 2 - w / 2, this.camera.viewportH / 2 + h / 2 );
	}

	deathDraw( context: CanvasRenderingContext2D ) {
		if ( !Debug.flags.SHOW_DEATH ) return;

		if ( this.replayIndex < this.replayImages.length ) {
			let finalPos = this.replayImages.slice( -1 )[0].playerPos;

			let offset = this.replayImages[this.replayIndex].playerPos.minus( finalPos );

			/* option 2 

			let context2 = tempCanvas.getContext( '2d' );
			context2.clearRect( 0, 0, tempCanvas.width, tempCanvas.height );
			context2.putImageData( this.replayImages[this.replayIndex].image, 0, 0 );

			context.save();
				this.camera.moveContext( context );
				context.scale( deathReplayScale, deathReplayScale );
				
				context.drawImage( tempCanvas, offset.x - this.camera.viewportW / 2, offset.y - this.camera.viewportH / 2 );
			context.restore();*/

			context.putImageData( this.replayImages[this.replayIndex].image, offset.x, offset.y );
		}

		let ir = this.ir * this.camera.viewportW / 400;

		context.save();
			context.translate( this.camera.viewportW / 2, this.camera.viewportH / 2 );
			context.globalCompositeOperation = 'destination-in';
			context.fillStyle = 'white';
			context.beginPath();
			context.arc( 0, 0, ir, 0, Math.PI * 2 );
			context.fill();
			context.globalCompositeOperation = 'source-over';

			// easier to overlay white than change image's alpha layer
			context.globalAlpha = 0.7 + 0.3 * ( 1 - this.replayAlpha );
			context.fillStyle = 'white';
			context.beginPath();
			context.arc( 0, 0, ir, 0, Math.PI * 2 );
			context.fill();
			context.globalAlpha = 1.0;
		context.restore();
	}
}