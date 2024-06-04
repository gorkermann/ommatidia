import { Anim, AnimField, AnimFrame, AnimTarget } from './lib/juego/Anim.js'
import { solveCollisionsFor } from './lib/juego/collisionSolver.js'
import { Angle } from './lib/juego/Angle.js'
import { Camera } from './lib/juego/Camera.js'
import { Contact } from './lib/juego/Contact.js'
import { Entity, TopLeftEntity, cullList, TransformOrder } from './lib/juego/Entity.js'
import { GridArea } from './lib/juego/GridArea.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Line } from './lib/juego/Line.js'
import { Material, RGBA } from './lib/juego/Material.js'
import { constructors, nameMap } from './lib/juego/constructors.js'
import { RayHit } from './lib/juego/RayHit.js'
import { ScrollBox } from './lib/juego/ScrollBox.js'
import { Shape } from './lib/juego/Shape.js'
import { TileArray } from './lib/juego/TileArray.js'
import { FuncCall } from './lib/juego/serialization.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { secsToTimeStr } from './lib/juego/util.js'

import * as tp from './lib/toastpoint.js'

import { Coin } from './Coin.js'

import { RoomManager } from './RoomManager.js'
import { OmmatidiaScene } from './Scene.js'

import { Bullet, PlayerBullet } from './Bullet.js'
import { CenteredEntity } from './CenteredEntity.js'
import { COL, MILLIS_PER_FRAME, REWIND_SECS } from './collisionGroup.js'
import { Player } from './Player.js'
import { Platform } from './Platform.js'
import { shapecast, renderFromEye, renderRays, whiteText } from './render.js'

import { clearLcdQueue, sendLcdByte, lcdPrint } from './lcd.js'

import * as Debug from './Debug.js'

import child_process from 'child_process'

let MODE_GRAVITY = 0;
let MODE_SQUARE = 1;
let MODE_FREE = 2;

async function sleepAsync( ms: number ): Promise<void> {
	return new Promise( ( resolve, reject ) => {
		setTimeout( resolve, ms );
	} );
}

///////////
// LEVEL //
///////////

/*
	Scene holding a player area 
*/

type Mark = {
	name: string;
	timestamp: number;
}

let start = 0;
let marks: Array<Mark> = [];

function pushMark( name: string ) {
	marks.push( { name: name, timestamp: new Date().getTime() } );
}

let DEFAULT_WIDTH = 400;

let deathReplayScale = 4.0;

type ReplayImage = {
	image: ImageData,
	playerPos: Vec2
}

enum LevelState {
	DEFAULT = 0,
	DEATH_MENU,
	SUCCESS_MENU,
}

class Message extends Entity {
	text: string;
	index: number;

	/* property overrides */

	isGhost: boolean = true;

	constructor( pos: Vec2=new Vec2(), index: number=0, text: string='' ) {
		super( pos, 0, 0 );

		this.index = index;
		this.text = text;

		this.collisionGroup = COL.ITEM;
	}
}

let playerBulletMaterial = new Material( 45, 0.0, 1.0 );
playerBulletMaterial.alpha = 0.3;

let playerMaterial = new Material( 0, 0, 1.0 );

let optionPanel: HTMLDivElement = null;
if ( typeof document !== 'undefined' ) {
	optionPanel = document.getElementById( 'optionpanel' ) as HTMLDivElement;
}

class LevelGrid extends GridArea {
	hitWith( otherEntity: Entity ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;
		}
	}
}

class Wave {
	entities: Array<Entity> = [];

	constructor( list: any ) {
		for ( let obj of list ) {
			if ( obj['pos'] && obj['vel'] ) {
				let pos = new Vec2( obj['pos'].x, obj['pos'].y );
				let vel = new Vec2( obj['vel'].x, obj['vel'].y );

				if ( obj['coin'] ) {
					let coin = new Coin( pos );
					coin.vel = vel;
					coin.collisionGroup = COL.ITEM;

					this.entities.push( coin );
				} else {
					if ( obj['stack'] ) {
						let y = 0;

						for ( let i = 0; i < obj['stack']; i++ ) {
							let bullet = new Bullet( pos.plus( new Vec2( 0, y ) ), vel );
							bullet.collisionGroup = COL.ENEMY_BULLET;

							this.entities.push( bullet );

							y -= 30;
							if ( Math.random() > 0.7 ) y -= 30;
						}
					} else {
						let bullet = new Bullet( pos, vel );
						bullet.collisionGroup = COL.ENEMY_BULLET;

						this.entities.push( bullet );
					}
				}
			}
		}

		console.log( 'Wave.constructor(): created ' + this.entities.length + ' entities' );
	}
}

class Ping {
	pos: Vec2;
	alpha: number = 1.0;
	spread: number = 1;
	wait: boolean = true;
	removeThis: boolean = false;

	constructor( pos: Vec2 ) {
		this.pos = pos;
	}
}

export class SideLevel extends OmmatidiaScene {
	grid: LevelGrid = new LevelGrid();

	rooms: Array<RoomManager> = [];

	// level info
	player: Player = null;
	controlMode: number = MODE_GRAVITY;
	grav: Vec2 = new Vec2( 0, 2 );
	maxFallSpeed: number = 10;
	data: any;

	//
	paused: boolean = false;

	tryCount: number = 0;
	
	cursorPos: Vec2 = new Vec2( 0, 0 );
	
	healthBar: number = 0;
	healthBarMax: number = 0;
	haloWidth: number = 40;

	oldTime: number = 0;
	elapsedTotal: number = 0;

	ir: number = 300;
	or: number = 320;
	overlay: Array<RGBA> = [];

	state: LevelState = LevelState.DEFAULT;
	fadeMaterial: Material = new Material( 0, 0, 0.0 );

	newChar: boolean = false;
	messageQueue: Array<string> = []; // can have newlines
	stringIndex: number = 0; // character index of messageQueue[0] as it is transferred to displayText[-1]
	displayText: Array<string> = [] // one line each

	waves: Array<Wave> = [];
	currentWave: Wave = null;

	coinCount: number = 0;

	start: number = 0;

	messageAnim = new Anim( {
		'newChar': new AnimField( this, 'newChar' )
	},
	new AnimFrame( {} ) ); 

	anim = new Anim( {
		'healthBar': new AnimField( this, 'healthBar', 3 ),
		'haloWidth': new AnimField( this, 'haloWidth', 5 ),
		'or': new AnimField( this, 'or', 40 ),
		'ir': new AnimField( this, 'ir', 40 ),
		'state': new AnimField( this, 'state', 0 ),
		'fadeAlpha': new AnimField( this.fadeMaterial, 'alpha', 0.1 ),
		'fadeLum': new AnimField( this.fadeMaterial, 'lum', 0.1 ),
	},
	new AnimFrame( {
		'healthBar': { value: 0 },
		'haloWidth': { value: 40 },
		'or': { value: 120 },
		'ir': { value: 100},
	} ) );

	pingAnim = new Anim(); // dynamically populated
	pings: Array<Ping> = [];

	discardFields: Array<string> = ['em', 'textBox', 'textBoxHeight', 'text', 'textIndex', 'speaker',
					 'updateQueue', 'boundKeyHandler', 'cursorPos', 'oldTime',
					 'replayImages', 'replayCount', 'replayIndex', 'replayAlpha'];
	//saveFields = ['grid', 'player', 'controlMode', 'grav', 'data', 'bossHealthMax'];

	constructor( name: string, data: any, retry: boolean ) {
		super( name );

		this.data = data;
		this.start = new Date().getTime();

		clearLcdQueue();
		this.messageQueue.push( this.name );

		this.or = 120;
		this.ir = 100;
		/* alternative transition:
		this.or = 320
		this.ir = 300

		this.anim.pushFrame( new AnimFrame( {
			'or': { value: 120, expireOnReach: true } } ) );
		this.anim.pushFrame( new AnimFrame( { 
			'ir': { value: 100, expireOnReach: true } } ) );*/

		if ( retry ) {
			this.fadeMaterial.lum = 0;
			this.fadeMaterial.alpha = 1.0;
			this.anim.pushFrame( new AnimFrame( { 
				'fadeAlpha': { value: 0 } } ) );
		} else {
			this.fadeMaterial.lum = 1.0;
			this.fadeMaterial.alpha = 1.0;
			this.anim.pushFrame( new AnimFrame( { 
				'fadeAlpha': { value: 0 } } ) );
		}
	}

	load(): Promise<any> {
		this.em.clear();

		this.grid = new LevelGrid();

		this.grid.load( this.data );

		this.tryCount += 1;

		Debug.setFlags( { 'DRAW_NORMAL': this.data.drawNormal } );
		this.controlMode = this.data.controlMode;	

		let gridEnt = new Entity( new Vec2( 0, 0 ), 0, 0 );
		gridEnt.isGhost = true;
		gridEnt.collisionGroup = COL.LEVEL;
		gridEnt.collisionMask = COL.PLAYER_BULLET | COL.ENEMY_BULLET;

		gridEnt.hitWith = function( otherEntity: Entity ) {
			if ( otherEntity instanceof Bullet ) {
				otherEntity.removeThis = true;
			}
		}

		let pos: Vec2 = new Vec2();	

		this.rooms = [];
		let roomW = this.grid.roomWidth * this.grid.tileWidth;
		let roomH = this.grid.roomHeight * this.grid.tileHeight;
		let roomRowLen = Math.ceil( this.grid.hTiles / this.grid.roomWidth );
		for ( let r = 0; r < Math.ceil( this.grid.vTiles / this.grid.roomHeight ); r++ ) {
			for ( let c = 0; c < roomRowLen; c++ ) {
				this.rooms.push( new RoomManager(
					Shape.makeRectangle( new Vec2( c * roomW - this.grid.tileWidth / 2, r * roomH - this.grid.tileHeight / 2 ), roomW, roomH ) ) );
			}
		}

		let messages = [];

		for ( let c = 0; c <= this.grid.hTiles; c++ ) {
			for ( let r = 0; r <= this.grid.vTiles; r++ ) {
				let index = this.grid.spawnLayer.get( r, c );

				pos.setValues( ( c + 0.0 ) * this.grid.tileWidth,
							   ( r + 0.0 ) * this.grid.tileHeight );

				let room = this.rooms[Math.floor( r / this.grid.roomHeight ) * roomRowLen + 
									  Math.floor( c / this.grid.roomWidth )];

				// regular wall
				if ( index == 1 ) {
					let block = new CenteredEntity(
									new Vec2( c * this.grid.tileWidth, r * this.grid.tileHeight ),
									this.grid.tileWidth,
									this.grid.tileHeight );

					block.material = new Material( this.data.hue, 1.0, 0.5 );
					if ( Debug.flags.LEVEL_ALT_MAT ) block.altMaterial = new Material( this.data.hue + 30, 1.0, 0.5 );
					gridEnt.addSub( block );

				} else if ( index == 2 ) {
					let block = new CenteredEntity(
									new Vec2( c * this.grid.tileWidth, r * this.grid.tileHeight ),
									this.grid.tileWidth,
									this.grid.tileHeight  * 5);

					block.angle = Math.PI / 4;
					block.transformOrder = TransformOrder.ROTATE_THEN_TRANSLATE;
					block.angleVel = 0.05;
					block.material = new Material( this.data.hue, 1.0, 0.5 );
					if ( Debug.flags.LEVEL_ALT_MAT ) block.altMaterial = new Material( this.data.hue + 30, 1.0, 0.5 );
					gridEnt.addSub( block );

				// player
				} else if ( index == 10 ) {
					this.player = new Player( pos.plus( new Vec2( 10, 0 ) ) );
					this.player.collisionGroup = COL.PLAYER_BODY;
					this.player.collisionMask = COL.ENEMY_BODY | COL.ENEMY_BULLET | COL.LEVEL | COL.ITEM;
					this.player.material = playerMaterial.copy();
					this.em.insert( this.player );	

				// coin
				} else if ( index == 11 ) {
					let coin = new Coin( pos.copy() );
					coin.collisionGroup = COL.ITEM;

					this.em.insert( coin );

				} else if ( index >= 40 && index < 50 ) {
					let platIndex = index - 40;

					if ( this.data.platforms && platIndex >= 0 && platIndex < this.data.platforms.length ) {
						let obj = this.data.platforms[platIndex];
						let w = ( obj.width ? obj.width : 1 );
						let h = ( obj.height ? obj.height : 1 );

						let plat = new Platform( 
									new Vec2( ( c + ( w - 1 ) / 2 ) * this.grid.tileWidth, ( r + ( h - 1 ) / 2 ) * this.grid.tileHeight ),
									this.grid.tileWidth * w,
									this.grid.tileHeight * h );

						plat.velIntent.setValues( obj.velX ? obj.velX : 0, obj.velY ? obj.velY : 0 );
						
						if ( obj.limitX ) {
							if ( obj.limitX < 0 ) plat.limitLow.x = plat.pos.x + obj.limitX * this.grid.tileWidth;
							if ( obj.limitX > 0 ) plat.limitHigh.x = plat.pos.x + obj.limitX * this.grid.tileWidth;
						}

						if ( obj.limitY ) {
							if ( obj.limitY < 0 ) plat.limitLow.y = plat.pos.y + obj.limitY * this.grid.tileHeight;
							if ( obj.limitY > 0 ) plat.limitHigh.y = plat.pos.y + obj.limitY * this.grid.tileHeight;
						}

						plat.material = new Material( this.data.hue, 1.0, 0.5 );
						if ( Debug.flags.LEVEL_ALT_MAT ) plat.altMaterial = new Material( this.data.hue + 30, 1.0, 0.5 );
						this.em.insert( plat );

					} else {
						console.error( 'SideLevel.load(): Platform index ' + ( index - 40 ) + ' not found' );
					}

				} else if ( index >= 50 ) {
					let msgIndex = index - 50;

					if ( this.data.messages && msgIndex >= 0 && msgIndex < this.data.messages.length ) {
						if ( !messages[msgIndex] ) {
							messages[msgIndex] = new Message( new Vec2(), msgIndex, this.data.messages[msgIndex] );

							this.em.insert( messages[msgIndex] );
						}

						let box = new CenteredEntity( pos.copy(), this.grid.tileWidth, this.grid.tileHeight );
						box.material.alpha = 0.0;
						messages[msgIndex].addSub( box );

					} else {
						console.error( 'Level.load: Invalid message index ' + msgIndex );
					}
				}
			}
		}

		for ( let room of this.rooms ) {
			room.freeze();
		}

		/*if ( this.data['waves'] ) {
			for ( let obj of this.data['waves'] ) {
				this.waves.push( new Wave( obj ) );
			}
		}*/

		this.em.insert( gridEnt );

		this.coinCount = this.em.entities.filter( x => x instanceof Coin ).length;

		return new Promise( function(resolve, reject) {
			resolve(0);
		});
	}

	update() {
		let now = new Date().getTime();
		marks = [];

		pushMark( 'start' );

		if ( this.oldTime == 0 ) this.oldTime = now;
		let elapsed = now - this.oldTime;
		this.oldTime = now;

		let frameStep = 1.0;//elapsed / 60;

		// no pause in menus
		if ( this.state != LevelState.DEFAULT ) this.paused = false;

		// animate
		if ( !this.paused ) {
			this.anim.update( frameStep, elapsed );
			this.pingAnim.update( frameStep, elapsed );
			this.messageAnim.update( frameStep, elapsed );

			this.updateMessages();
		}

		pushMark( 'm' );

		if ( this.state == LevelState.SUCCESS_MENU ) {
			if ( Keyboard.keyHit( KeyCode.W ) ) {
				this.pushControlMessage( 'complete' );
			}

		} else {
			if ( Keyboard.keyHit( KeyCode.SPACE ) ) {
				if ( this.paused ) {
					this.paused = false;
					if ( optionPanel ) optionPanel.classList.add( 'hidden' );

					for ( let sound of this.sounds ) {
					//	sound.play();
					}
				} else {
					this.paused = true;
					if ( optionPanel ) optionPanel.classList.remove( 'hidden' );

					for ( let sound of this.sounds ) {
					//	sound.pause();
					}
				}
			}

			if ( Keyboard.keyHit( KeyCode.X ) ) {
				Debug.toggleFlag( 'RANGING_VIEW' );

				if ( Debug.flags.RANGING_VIEW ) {
					lcdPrint( 'RANGING MODE' );
				} else {
					lcdPrint( 'TRUE COLOR MODE' );
				}
			}

			if ( Keyboard.keyHit( KeyCode.Q ) && this.player.transponderCharge >= 1 ) {
				this.player.transponderCharge = 0;
				this.player.anim.pushFrame( new AnimFrame( {}, [
					new FuncCall<typeof this.pushMessage>( this, 'pushMessage', ['TRANSPONDER CHARGED'] )
				] ) )

				this.player.anim.pushFrame( new AnimFrame( {
					'transponderCharge': { value: 1.0, reachOnCount: 10000 },
				} ) );

				this.pingAnim.clear();
				this.pingAnim.fields = {};

				this.pings = [];
				for ( let entity of this.em.entities ) {
					if ( entity instanceof Coin ) {
						let ping = new Ping( entity.pos.copy() );
						ping.alpha = 0;

						this.pings.push( ping );
					}
				}

				// use a different thread for each ping target
				let thread = 0;

				for ( let i = 0; i < this.pings.length; i++ ) {
					let id = 'ping' + i;

					this.pingAnim.fields[id + '-wait'] = new AnimField( this.pings[i], 'wait', 0.1 );
					this.pingAnim.fields[id + '-alpha'] = new AnimField( this.pings[i], 'alpha', 0.1 );
					this.pingAnim.fields[id + '-spread'] = new AnimField( this.pings[i], 'spread', 0.3 );
					this.pingAnim.fields[id + '-removeThis'] = new AnimField( this.pings[i], 'removeThis' );

					let dist = this.pings[i].pos.distTo( this.player.pos );

					let frame = new AnimFrame();
					frame.targets[id + '-removeThis'] = new AnimTarget( true );
					this.pingAnim.pushFrame( frame, 
						{ threadIndex: thread } );

					frame = new AnimFrame();
					frame.targets[id + '-alpha'] = new AnimTarget( 0 );
					frame.targets[id + '-spread'] = new AnimTarget( 10 );
					this.pingAnim.pushFrame( frame, 
						{ threadIndex: thread } );

					frame = new AnimFrame();
					frame.targets[id + '-alpha'] = new AnimTarget( 1, { overrideRate: 0 } );
					this.pingAnim.pushFrame( frame, 
						{ threadIndex: thread } );

					frame = new AnimFrame();
					frame.targets[id + '-wait'] = new AnimTarget( true, { expireOnCount: dist * 2 } );
					this.pingAnim.pushFrame( frame, 
						{ threadIndex: thread } );

					thread += 1;
				}
			}

			if ( this.paused ) {
				this.oldTime = new Date().getTime();
			} else {
				this.defaultUpdate( frameStep, elapsed );
			}
		}

		pushMark( 'end' );

		let str = '';
		for ( let i = 1; i < marks.length; i++ ) {
			str += marks[i].name + ':' + ( marks[i].timestamp - marks[i-1].timestamp ) + ', ';
		}
		console.log( str );
	}

	updateMessages() {
		if ( this.messageAnim.isDone() ) {
			if ( this.messageQueue.length > 0 ) {
				if ( this.stringIndex == 0 ) {
					this.displayText.push( '' );
				}

				if ( this.stringIndex >= this.messageQueue[0].length ) {
					this.stringIndex = 0;
					this.messageQueue.shift();

					if ( this.messageQueue.length == 0 ) {
						//this.messageQueue.push( new Date().getTime() - this.start + 'ms' );
						this.start = new Date().getTime();
					}

				} else {
					let char = this.messageQueue[0][this.stringIndex];

					if ( char == '\n' ) {
						this.displayText.push( '' );
					} else {
						this.displayText[this.displayText.length - 1] += char;
					}

					if ( typeof document === 'undefined' ) {
						if ( this.stringIndex == 0 ) {
							sendLcdByte( false, 0x01 ); // clear
							sendLcdByte( false, 0x02 ); // return
						}

						sendLcdByte( true, char.charCodeAt( 0 ) );
					}

					this.stringIndex += 1;
				}

				this.messageAnim.pushFrame( new AnimFrame( {
					'newChar': { value: true, expireOnCount: 50 }
				} ) );
			}
		}
	}

	defaultUpdate( frameStep: number, elapsed: number ) {
		this.elapsedTotal += elapsed;

		this.updateSounds();

		for ( let entity of this.em.entities ) {
			entity.updateGrav( this.grav );
		}

		pushMark( 'k' );

		// insert player bullets
		this.em.insertSpawned();
		pushMark( '_' );

		this.em.updateShapeCache();
		pushMark( '_' );

		Debug.strokeAll( this.em.entities );

		let treeGroup: Array<number> = [];
		let treeMask: Array<number> = [];
		for ( let entity of this.em.entities ) {
			treeGroup.push( entity.treeCollisionGroup() );
			treeMask.push( entity.treeCollisionMask() );
		}

		let entity, otherEntity: Entity;

		for ( let i = 0; i < this.em.entities.length; i++ ) {
			entity = this.em.entities[i];

			for ( let j = 0; j < this.em.entities.length; j++ ) {
				if ( i == j ) continue;
				if ( ( treeMask[i] & treeGroup[j] ) == 0 ) continue;

				otherEntity = this.em.entities[j];
				let contacts = entity.overlaps( otherEntity, frameStep, true );

				if ( contacts.length > 0 ) {
					Debug.strokeAll( this.em.entities );

					entity.hitWithMultiple( otherEntity, contacts );
				}
			}

			if ( entity instanceof Player ) {
				if ( entity.messages.length > 0 ) {
					this.messageQueue = this.messageQueue.concat( entity.messages );
					entity.messages = [];
				}
			}
		}

		for ( let entity of this.em.entities ) {
			if ( entity.isPliant ) {
				let result = solveCollisionsFor( entity, this.em.entities, COL.ENEMY_BODY | COL.LEVEL, COL.LEVEL, frameStep, true ); 
			}
		}

		let result = solveCollisionsFor( this.player, this.em.entities, COL.ENEMY_BODY | COL.LEVEL, COL.LEVEL, frameStep, true );

		pushMark( 'c' );

		this.em.advance( frameStep );
		for ( let entity of this.em.entities ) {
			entity.watch( this.player.pos );
		}

		pushMark( '_' );

		let playerShape = this.player.getShapes()[0];
		for ( let room of this.rooms ) {
			room.update( playerShape );
		}

		pushMark( '_' );

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Message ) {
				if ( this.player.overlaps( entity, 0.0, true ).length > 0 ) {
					this.messageQueue.push( ( entity as Message ).text );
					entity.destructor();
				}
			}
		}

		// no position changes from here on (animate only sets velocities)

		pushMark( 'adv' );

		this.em.animate( frameStep, elapsed );
		this.em.update();

		this.player.updateCollisionGrav( result.blockedContacts, this.grav );

		if ( this.player.health <= 0 || result.crushed ) {
			if ( result.crushed ) {
				this.player.causeOfDeath = 'You have been crushed by the ' + result.crusher.flavorName;
			}
		
			this.killPlayer();
		}

		if ( !this.currentWave && this.waves.length > 0 ) {
			this.currentWave = this.waves.shift();

			for ( let entity of this.currentWave.entities ) {
				this.em.insert( entity );
			}
		}

		pushMark( 'upd' );

		this.checkForSuccess();

		this.em.insertSpawned();
		this.em.cull();

		let coinCount = this.em.entities.filter( x => x instanceof Coin ).length;
		if ( coinCount != this.coinCount ) {
			this.coinCount = coinCount;
			if ( coinCount > 0 ) {
				this.messageQueue.push( this.coinCount + ' unstable photon' + ( this.coinCount == 1 ? '' : 's' ) + ' remaining' );
			}

			if ( this.coinCount == 0 ) {
				if ( typeof document === 'undefined' ) child_process.exec( 'aplay ./sfx/roll_laser_as.wav' );
			} else {
				if ( typeof document === 'undefined' ) child_process.exec( 'aplay ./sfx/roll_laser_f.wav' );
			}
		}
		

		if ( this.currentWave ) {
			cullList( this.currentWave.entities );
			if ( this.currentWave.entities.length == 0 ) {
				this.currentWave = null;
			}
		}

		let boundary = 200;

		pushMark( 'ins' );

		for ( let entity of this.em.entities ) {
			if ( entity == this.player ) {
				//if ( entity.pos.x < -boundary ||
				//	 entity.pos.x > this.grid.hTiles * this.grid.tileWidth + boundary ||
				//	 entity.pos.y < -boundary ||
				if ( entity.pos.y > this.grid.vTiles * this.grid.tileWidth + boundary ) {

					if ( entity == this.player ) {
						if ( this.state == LevelState.DEFAULT ) {
							clearLcdQueue();
							this.clearMessageQueue();
							this.messageQueue.push( 'CONNECTION LOST' );
							if ( typeof document === 'undefined' ) child_process.exec( 'aplay ./sfx/death.wav' );

							setTimeout( () => {
								this.pushControlMessage( 'death' );
							}, 5000 )

							this.state = LevelState.DEATH_MENU;
						}
						
					} else if ( entity instanceof Bullet ) {
						entity.removeThis = true;
					}
				}
			}
		}

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Bullet ) {
				if ( entity.pos.x < 0 && entity.vel.x < 0 ) entity.removeThis = true;
				if ( entity.pos.x > this.grid.hTiles * this.grid.tileWidth && entity.vel.x > 0 ) entity.removeThis = true;
				if ( entity.pos.y < 0 && entity.vel.y < 0 ) entity.removeThis = true;
				if ( entity.pos.y > this.grid.vTiles * this.grid.tileWidth && entity.vel.y > 0 ) entity.removeThis = true;
			}
		}
	}

	killPlayer() {
		this.anim.clear();

		this.messageQueue.push( this.player.causeOfDeath )
		//this.messageQueue.push( 'Press Z to go back ' + REWIND_SECS + ' seconds or R to restart level' );
		this.messageQueue.push( 'Press R to restart level' );

		// change state
		this.anim.pushFrame( new AnimFrame( {
			'state': { value: LevelState.DEATH_MENU, expireOnReach: true }
		} ) );
	}

	clearMessageQueue() {
		this.messageQueue = [];
		this.stringIndex = 0;
	}

	pushMessage( msg: string ) {
		this.messageQueue.push( msg );
	}

	pushControlMessage( msg: string ) {
		this.messages.push( msg );
	}

	checkForSuccess() {
		if ( this.state != LevelState.DEFAULT ) return;

		let success = true;
		let defeatedNames = [];

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Coin ) {
				success = false;
			}
		}

		if ( success ) {
			this.state = LevelState.SUCCESS_MENU;
			this.fadeMaterial.lum = 1.0;

			this.anim.clear();

			if ( this.final ) {
				let now = new Date().getTime();
				let totalTime = ( now - this.playerStatus.startTime ) / 1000;

				let timeStr = secsToTimeStr( totalTime );

				this.anim.pushFrame( new AnimFrame( {}, [
					new FuncCall<typeof this.pushMessage>( this, 'pushMessage', [
						'Your time was ' + timeStr + '. Press A to return to the main menu'
					] )
				] ) );

				this.anim.pushFrame( new AnimFrame( {}, [
					new FuncCall<typeof this.pushMessage>( this, 'pushMessage', [
						'Congratulations! You have stabilized all the photons and beaten Ommatidia'
					] )
				] ) );
				
			} else {
				this.anim.pushFrame( new AnimFrame( {}, [
					new FuncCall<typeof this.pushControlMessage>( this, 'pushControlMessage', ['complete'] )
				] ) );	
			}

			this.anim.pushFrame( new AnimFrame( {
				'fadeAlpha': { value: 1.0 }
			} ) );

		}
	}

	pickFromEye( dir: Vec2 ): Array<Entity> { return [] }

	/* Drawing */

	draw( context: CanvasRenderingContext2D ) {
		marks = [];

		pushMark( 'start' );

		this.camera.pos.set( this.player.pos );

		if ( this.state == LevelState.DEATH_MENU ) {
			this.deathDraw( context );
			this.defaultDraw( context );

		} else {
			this.em.shade();

			if ( !this.paused ) {
				//this.appendReplayFrame( context );
			}

			this.defaultDraw( context );

			if ( this.paused ) {
				this.drawPauseOverlay( context );
			}
		}

		if ( typeof document !== 'undefined' ) {
			// draw newest messages lowest
			let y = this.camera.viewportH - 20;
			let x = 10;

			if ( !Debug.flags.DRAW_NORMAL ) {
				y = this.camera.viewportH / 2 + 20;
				x = this.camera.viewportW / 2 - this.ir * this.camera.viewportW / 400 * 0.9;
			}

			for ( let i = this.displayText.length - 1; i >= this.displayText.length - 4 && i >= 0; i-- ) {
				whiteText( context, this.displayText[i], x, y );
				y -= 20;
			}
		}

		pushMark( 'end' );

		let str = '';
		for ( let i = 1; i < marks.length; i++ ) {
			str += marks[i].name + ':' + ( marks[i].timestamp - marks[i-1].timestamp ) + ', ';
		}
		console.log( str );
	}

	private updateOverlay( sliceCount: number, origin: Vec2 ) {
		let rgba = this.fadeMaterial.getRGBA();

		while ( this.overlay.length < sliceCount ) {
			this.overlay.push( { r: 1, g: 1, b: 1, a: 0 } );
		}

		if ( this.overlay.length > sliceCount ) {
			this.overlay = this.overlay.slice( 0, sliceCount );
		}

		for ( let i = 0; i < this.overlay.length; i++ ) {
			this.overlay[i] = rgba;
		}

		cullList( this.pings );
		for ( let ping of this.pings ) {
			let angle = Angle.toPosTurn( ping.pos.minus( origin ).angle() );
			let index = Math.round( angle / ( Math.PI * 2 ) * sliceCount );

			for ( let i = 0; i < ping.spread; i++ ) {
				this.overlay[index + i] = { r: 1, g: 1, b: 1, a: ping.alpha };
				this.overlay[index - i] = { r: 1, g: 1, b: 1, a: ping.alpha };
			}
		}
	}

	defaultDraw( context: CanvasRenderingContext2D, camera: Camera=this.camera ) {

		/* Prepare Scene */

		// put origin near the top of the player to give a better view (than origin at center)
		/*
			considerations:
			the player is chamfered at the upper corners in order to accommodate slight
			misalignments when jumping beside (so as to go up the side, not hit the bottom)
			--> origin should be no higher than the beginning of this chamfer

			an origin on the edge of some object may see its inside
			--> viewpoint should not be on an edge of the player 
		*/
		let origin = this.player.pos
						.minus( new Vec2( 0, this.player.height / 4 ) );

		let ir = this.ir * camera.viewportW / 400;
		let or = this.or * camera.viewportW / 400;
		let haloW = this.haloWidth * camera.viewportW / 400;

		let shapesMinusPlayer = [];

		let sliceCount = parseInt( Debug.fields['SLICE_COUNT'].value );
		if ( isNaN( sliceCount ) ) sliceCount = 360;

		for ( let entity of this.em.entities ) {
			if ( entity == this.player ) continue;

			for ( let shape of entity.getShapes( 1.0, { useCached: true } ) ) {
				shapesMinusPlayer.push( shape );	
			}
		}

		pushMark( '_' );

		this.updateOverlay( sliceCount, origin );

		/* Draw Scene */

		if ( typeof document === 'undefined' ) {
			renderFromEye( context, shapesMinusPlayer, origin, this.player.vel, sliceCount, or, ir, this.overlay );

			pushMark( 'r' );

			return;
		}

		let shapes = this.getShapes();

		// draw 2D
		if ( Debug.flags.DRAW_NORMAL ) {
			this.camera.moveContext( context );
				this.em.draw( context );
			
				if ( Debug.flags.DRAW_RAYS ) {
					renderRays( context, shapes, origin, sliceCount );
				}

				if ( Debug.flags.DRAW_ROOMS ) {
					context.lineWidth = 1;
					context.strokeStyle = 'white';

					for ( let room of this.rooms ) { 
						room.area.stroke( context, { setStyle: false } );
					}
				}
			this.camera.unMoveContext( context );

		// draw from eye
		} else {
			if ( Debug.flags.DRAW_FROM_EYE ) {
				let shapesMinusPlayer = [];

				for ( let entity of this.em.entities ) {
					if ( entity == this.player ) continue;

					shapesMinusPlayer.push( ...entity.getShapes( 0.0 ) );
				}

				context.save();
					context.translate( this.camera.viewportW / 2, this.camera.viewportH / 2 );

					renderFromEye( context, shapesMinusPlayer, origin, this.player.vel, sliceCount, or, ir, this.overlay );

					if ( this.player.wince > 0 ) {
						context.lineWidth = or - ir;
						context.globalAlpha = this.player.wince;
						context.strokeStyle = 'red';
						context.beginPath();
						context.arc( 0, 0, ( or + ir ) / 2, 0, Math.PI * 2 );
						context.stroke();
						context.globalAlpha = 1.0;
					}

					ir = or + 2;
					or = ir + this.haloWidth;

					let gradient = context.createRadialGradient(0, 0, ir, 0, 0, or);
					gradient.addColorStop(0, 'hsl( 210, 100%, 90% )');
					gradient.addColorStop(1, 'hsla( 0, 0%, 100%, 0% )');
				context.restore();
			}
		}
	}

	deathDraw( context: CanvasRenderingContext2D ) {}
}