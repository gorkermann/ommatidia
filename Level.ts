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
import { SnakeBoss } from './boss/SnakeBoss.js'
import { CarrierBoss } from './boss/CarrierBoss.js'

import { HorizDoor } from './Door.js'
import { RoomManager } from './RoomManager.js'
import { Scene, SceneDrawOptions } from './Scene.js'

import { Bullet, PlayerBullet } from './Bullet.js'
import { CenteredEntity } from './CenteredEntity.js'
import { COL, MILLIS_PER_FRAME, REWIND_SECS } from './collisionGroup.js'
import { Player, PlayerStatus } from './Player.js'
import { shapecast, renderFromEye, renderRays, whiteText, vals as sliderVals } from './render.js'

import { Orbiter, Blocker, Elevator, Tumbler, Door, StaticBumpkin, SniperBumpkin } from './TutorialEntity.js'
import { PortalRing } from './PortalRing.js'

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
	PROMPT,
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

export class LevelGrid extends GridArea {
	hitWith( otherEntity: Entity ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;
		}
	}
}

export class Level extends Scene {
	grid: LevelGrid = new LevelGrid();

	rooms: Array<RoomManager> = [];

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
	playerStatus: PlayerStatus;
	
	cursorPos: Vec2 = new Vec2( 0, 0 );
	
	healthBar: number = 0;
	healthBarMax: number = 0;
	haloWidth: number = 40;

	oldGameTime: number = 0;
	oldTime: number = 0;
	elapsedTotal: number = 0;

	ir: number = 300;
	or: number = 320;

	state: LevelState = LevelState.DEFAULT;
	promptAccept: string = '';
	promptReject: string = '';

	replayImages: Array<ReplayImage> = [];
	replayCount: number = 10;
	replayIndex: number = 0;
	replayAlpha: number = 1.0;

	newChar: boolean = false;
	messageQueue: Array<string> = []; // can have newlines
	stringIndex: number = 0; // character index of messageQueue[0] as it is transferred to displayText[-1]
	displayText: Array<string> = [] // one line each

	sounds: Array<Sound> = [];

	messageAnim = new Anim( {
		'newChar': new AnimField( this, 'newChar' )
	},
	new AnimFrame( {} ) ); 

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
					 'updateQueue', 'boundKeyHandler', 'cursorPos', 'oldGameTime',
					 'replayImages', 'replayCount', 'replayIndex', 'replayAlpha'];
	//saveFields = ['grid', 'player', 'controlMode', 'grav', 'data', 'bossHealthMax'];

	constructor( name: string, playerStatus: PlayerStatus, data: any ) {
		super( name );

		this.playerStatus = playerStatus;

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
		this.grid = new LevelGrid();

		this.grid.load( this.data );

		this.tryCount += 1;

		Debug.setFlags( { 'DRAW_NORMAL': this.data.drawNormal } );
		this.controlMode = this.data.controlMode;	

		// lighting
		for ( let key in sliderVals ) {
			sliderVals[key].val = sliderVals[key].default;
		}

		if ( this.data.lighting ) {
			for ( let key in this.data.lighting ) {
				if ( key in sliderVals ) {
					sliderVals[key].val = this.data.lighting[key];
				}
			}
		}

		// TODO: update UI sliders, override defaults on UI change?

		// grid
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

					block.material = new Material( this.data.hue, 1.0, 0.3 );
					if ( Debug.flags.LEVEL_ALT_MAT ) block.altMaterial = new Material( this.data.hue, 1.0, 0.5 );
					gridEnt.addSub( block );

				// horizontal door
				} else if ( index == 2 ) {
					let door = new HorizDoor( pos.plus( new Vec2( 10, 0 ) ) );
					room.doors.push( door );

					this.em.insert( door );
					
				// vertical door
				} else if ( index == 3 ) {
					let door = new HorizDoor( pos.plus( new Vec2( 0, 10 ) ) );
					door.angle = Math.PI / 2;
					room.doors.push( door );

					this.em.insert( door );

				// player
				} else if ( index == 10 ) {
					this.player = new Player( pos.plus( new Vec2( 10, 0 ) ) );
					this.player.collisionGroup = COL.PLAYER_BODY;
					this.player.collisionMask = COL.ENEMY_BODY | COL.ENEMY_BULLET | COL.LEVEL | COL.ITEM;
					this.player.material = playerMaterial.copy();
					this.em.insert( this.player );
				
				// portals
				} else if ( index == 11 ) {
					let portals = new PortalRing( pos.minus( new Vec2( 0, this.grid.tileWidth ) ), this.playerStatus );

					this.em.insert( portals );

				// static bumpkin
				} else if ( index == 20 ) {
					let entity = new StaticBumpkin( pos.copy() );
					room.entities.push( entity );

					this.em.insert( entity );

				// bumpkin sniper
				} else if ( index == 21 ) {
					let entity = new SniperBumpkin( pos.copy() );
					room.entities.push( entity );

					this.em.insert( entity );
				
				} else if ( index == 22 ) {

				// maze bumpkin
				} else if ( index == 23 ) {

				// waterfall bumpkin
				} else if ( index == 24 ) {

				// big boss bumpkin
				} else if ( index == 25 ) {
					let boss = new LockBoss( pos.plus( new Vec2( -this.grid.tileWidth / 2, 0 ) ), true );

					this.em.insert( boss );
					this.startBossFight( boss );

				// big boss bumpkin
				} else if ( index == 26 ) {
					let boss = new RollBoss( pos.plus( new Vec2( -this.grid.tileWidth / 2, 0 ) ), true );

					this.em.insert( boss );
					this.startBossFight( boss );

				// big boss bumpkin
				} else if ( index == 27 ) {
					let boss = new ShellBoss( pos.plus( new Vec2( -this.grid.tileWidth / 2, 0 ) ), true );

					this.em.insert( boss );
					this.startBossFight( boss );

				// big boss bumpkin
				} else if ( index == 28 ) {
					let boss = new SwitchBoss( pos.plus( new Vec2( -this.grid.tileWidth / 2, 0 ) ), true );

					this.em.insert( boss );
					this.startBossFight( boss );

				// big boss bumpkin
				} else if ( index == 29 ) {
					let boss = new SnakeBoss( pos.plus( new Vec2( -this.grid.tileWidth / 2, 0 ) ), true );

					this.em.insert( boss );
					this.startBossFight( boss );				

				// big boss bumpkin
				} else if ( index == 30 ) {
					let boss = new CarrierBoss( pos.plus( new Vec2( -this.grid.tileWidth / 2, 0 ) ), true );

					this.em.insert( boss );
					this.startBossFight( boss );

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

		this.em.insert( gridEnt );

		this.or = 320;
		this.ir = 300;

		this.anim.pushFrame( new AnimFrame( {
			'or': { value: 120 } } ) );
		this.anim.pushFrame( new AnimFrame( { 
			'ir': { value: 100 } } ) );

		return new Promise( function(resolve, reject) {
			resolve(0);
		});
	}

	startBossFight( boss: Boss ) {
		this.healthBarMax = boss.getHealth();

		if ( boss.messages.length > 0 ) {
			this.messageQueue = this.messageQueue.concat( boss.messages );
			boss.messages = [];
		}

		this.anim.pushFrame( new AnimFrame( {
			'healthBar': {
				value: this.healthBarMax,
				setDefault: true
			}
		} ) );
	}

	update() {
		let now = new Date().getTime();

		// in-game time
		if ( this.oldGameTime == 0 ) this.oldGameTime = now;
		let gameElapsed = now - this.oldGameTime;
		this.oldGameTime = now;

		// real time
		if ( this.oldTime == 0 ) this.oldTime = now;
		let realElapsed = now - this.oldTime;
		this.oldTime = now;

		let frameStep = 1.0;//elapsed / 60;

		if ( !this.paused ) {
			this.anim.update( frameStep, gameElapsed );
		}

		/* update text output */

		if ( this.playerStatus.messages.length > 0 ) {
			this.messageQueue = this.messageQueue.concat( this.playerStatus.messages );

			this.playerStatus.messages.length = 0;
		}

		this.messageAnim.update( frameStep, realElapsed );

		if ( this.messageAnim.isDone() ) {
			if ( this.messageQueue.length > 0 ) {

				// new line for new message
				if ( this.stringIndex == 0 ) {
					this.displayText.push( '' );

				// new line for word wrapping
				//} else if ( this.displayText.length > 0 && this.displayText[this.displayText.length - 1].length >= 32 ) {
				//	this.displayText.push( '' );
				
				} else if ( this.displayText.length > 0 ) {
					let text = this.displayText.slice(-1)[0];

					if ( text.length > 0 && text[text.length - 1] == ' ' ) {
						let index = this.messageQueue[0].indexOf( ' ', text.length );
						
						let remainingInWord = index - text.length;
						if ( index < 0 ) remainingInWord = this.messageQueue[0].length - this.stringIndex;

						if ( text.length + remainingInWord > 32 ) {
							this.displayText.push( '' );
						}
					}
				}

				// done with message
				if ( this.stringIndex >= this.messageQueue[0].length ) {
					this.stringIndex = 0;
					this.messageQueue.shift();

				// add next character
				} else {
					let char = this.messageQueue[0][this.stringIndex];

					if ( char == '\n' ) {
						this.displayText.push( '' );
					} else {
						this.displayText[this.displayText.length - 1] += char;
					}

					this.stringIndex += 1;
				}

				this.messageAnim.pushFrame( new AnimFrame( {
					'newChar': { value: true, expireOnCount: 50 }
				} ) );
			}
		}

		/* pause/unpause */

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

		/* update game state */

		if ( this.state == LevelState.DEATH_REPLAY ) {
			// do nothing, anim only

		} else if ( this.state == LevelState.DEATH_MENU ) {
			if ( Keyboard.keyHit( KeyCode.W ) ) this.messages.push( 'restart' );
			//if ( Keyboard.keyHit( KeyCode.Z ) ) this.messages.push( 'rewind' );
			if ( Keyboard.keyHit( KeyCode.S ) ) this.messages.push( 'complete' ); // no defeated name added

			//if ( Keyboard.keyHit( KeyCode.LEFT ) ) this.replayIndex -= 1;
			//if ( Keyboard.keyHit( KeyCode.RIGHT ) ) this.replayIndex += 1;

			if ( this.replayIndex < 0 ) this.replayIndex = 0;
			if ( this.replayIndex > this.replayImages.length - 1 ) this.replayIndex = this.replayImages.length - 1;

		} else if ( this.state == LevelState.SUCCESS_MENU ) {
			if ( Keyboard.keyHit( KeyCode.W ) ) this.messages.push( 'complete' );

		} else if ( this.state == LevelState.PROMPT ) {
			if ( Keyboard.keyHit( KeyCode.W ) ) this.messages.push( this.promptAccept );
			if ( Keyboard.keyHit( KeyCode.S ) ) this.state = LevelState.DEFAULT;

		} else { // this.state == LevelState.DEFAULT
			if ( this.paused ) {
				this.oldGameTime = new Date().getTime(); // game time doesn't pass when paused

				if ( Keyboard.keyHit( KeyCode.UP ) || Keyboard.keyHit( KeyCode.W ) ) {
					// this.describe( this.lookVector );
				}
				
				if ( Keyboard.keyHit( KeyCode.RIGHT ) ) {
					// this.advanceLookVector( 1 );
				}

				if ( Keyboard.keyHit( KeyCode.RIGHT ) ) {
					// this.advanceLookVector( -1 );
				}

			} else {
				this.defaultUpdate( frameStep, gameElapsed );
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

		if ( this.controlMode == MODE_SQUARE ) {
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

			let shootVel = new Vec2();
			let now = new Date().getTime();

			if ( now - this.player.lastFireTime > this.player.fireInterval ) {
				if ( Keyboard.getHits( KeyCode.W ) > 0 ) shootVel.add( new Vec2( 0, -10 ) );
				if ( Keyboard.getHits( KeyCode.A ) > 0 ) shootVel.add( new Vec2( -10, 0 ) );
				if ( Keyboard.getHits( KeyCode.S ) > 0 ) shootVel.add( new Vec2( 0, 10 ) );
				if ( Keyboard.getHits( KeyCode.D ) > 0 ) shootVel.add( new Vec2( 10, 0 ) );

				if ( shootVel.length() > 0 ) {
					let bullet = new PlayerBullet( 
							this.player.pos.copy().plus( new Vec2( 0, 0 ) ),
							shootVel,
							playerBulletMaterial.copy() );

					this.player.spawnEntity( bullet );

					bullet.collisionGroup = COL.PLAYER_BULLET;
					bullet.collisionMask = 0x00;

					this.sounds.push( new Sound( './sfx/player_laser.wav' ) );
					this.player.lastFireTime = now;
				}
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
		this.em.updateShapeCache();

		Debug.strokeAll( this.em.entities );

		let treeGroup: Array<number> = this.em.entities.map( x => x.treeCollisionGroup() );
		let treeMask: Array<number> = this.em.entities.map( x => x.treeCollisionMask() );

		// overlapping
		for ( let i = 0; i < this.em.entities.length; i++ ) {
			let entity = this.em.entities[i];

			for ( let j = 0; j < this.em.entities.length; j++ ) {
				if ( i == j ) continue;
				if ( ( treeMask[i] & treeGroup[j] ) == 0 ) continue;

				let otherEntity = this.em.entities[j];
				let contacts = entity.overlaps( otherEntity, frameStep, true );

				if ( contacts.length > 0 ) {
					Debug.strokeAll( this.em.entities );

					entity.hitWithMultiple( otherEntity, contacts );
				}
			}
		}

		// solid collision
		for ( let entity of this.em.entities ) {
			if ( entity.isPliant ) {
				solveCollisionsFor( entity, this.em.entities, COL.ENEMY_BODY | COL.LEVEL | COL.PLAYER_BODY, COL.LEVEL, frameStep );
			}
		}

		let result = solveCollisionsFor( this.player, this.em.entities, COL.ENEMY_BODY | COL.LEVEL, COL.LEVEL, frameStep );

		this.em.advance( frameStep );
		for ( let entity of this.em.entities ) {
			entity.watch( this.player.pos );
		}

		let playerShape = this.player.getShapes()[0];
		for ( let room of this.rooms ) {
			room.update( playerShape );
		}

		// message passing
		for ( let i = 0; i < this.em.entities.length; i++ ) {
			let entity = this.em.entities[i];

			if ( entity.messages.length > 0 ) {
				for ( let message of entity.messages ) {

					// do something
					if ( message.length > 0 && message[0] == '!' ) {
						let words = message.split( ',' ).map( x => x.trim() );
						let ok = false;

						if ( words[0] == '!prompt' && words.length == 3 ) {
							this.state = LevelState.PROMPT;
							this.promptAccept = words[1];
							this.promptReject = words[2];

							ok = true;
						} else if ( words[0] == '!wipe' ) {
							for ( let entity of this.em.entities ) {
								if ( entity instanceof Bullet ) {
									entity.destructor(); // TODO: fade bullets out nicely
								}
							}

							ok = true;
						}

						if ( !ok ) {
							console.error( 'Level.defaultUpdate: Invalid message ' + message );
						}

					// output text to console
					} else {
						this.messageQueue.push( message );
					}
				}
				
				entity.messages = [];
			}
		}

		let messages = this.em.entities.filter( x => x instanceof Message ) as Array<Message>;
		for ( let msg of messages ) {
			if ( this.player.overlaps( msg, 0.0 ).length > 0 ) {
				this.messageQueue.push( msg.text );
				msg.destructor();
			}
		}

		// no position changes from here on (animate only sets velocities)

		this.em.animate( frameStep, elapsed );
		this.em.update();

		if ( this.player.health <= 0 || ( result.crushed && Debug.flags.ALLOW_CRUSH ) ) {
			if ( result.crushed ) {
				this.player.causeOfDeath = 'You have been crushed by the ' + result.crusher.flavorName;
			}
		
			this.killPlayer();
		}

		this.checkForSuccess(); // do this second, so if player wins and is killed in the same frame, the kill is overridden

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
						this.messages.push( 'death' );
						
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

		this.messageQueue.push( this.player.causeOfDeath )
		//this.messageQueue.push( 'Press Z to go back ' + REWIND_SECS + ' seconds or R to restart level' );
		this.messageQueue.push( 'Press W to restart level' );
		this.messageQueue.push( 'or S to return to the lobby' );

		// change state
		this.anim.pushFrame( new AnimFrame( {
			'state': { value: LevelState.DEATH_MENU }
		} ) );

		if ( Debug.flags.SHOW_DEATH ) {
			// fade out
			/*this.anim.pushFrame( new AnimFrame( {
				'replayAlpha': { value: 0.0 } 
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
				'replayAlpha': { value: 1.0 } 
			} ) );

			// change state
			this.anim.pushFrame( new AnimFrame( {
				'state': { value: LevelState.DEATH_REPLAY }
			} ) );
		}
	}

	checkForSuccess() {
		if ( this.state != LevelState.DEFAULT ) return;

		let success = false;
		let defeatedNames = [];

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Boss ) {
				success = true;

				if ( entity.preventSuccess() ) {
					success = false;
				} else {
					defeatedNames.push( entity.flavorName );
				}
			}
		}

		if ( success ) {
			if ( defeatedNames.length > 0 ) {
				this.playerStatus.defeatedNames = this.playerStatus.defeatedNames.concat( defeatedNames );

				this.anim.clear();

				this.messageQueue.push( 'You have defeated the ' + defeatedNames.join( ', ' ) + '.' );
				
				if ( this.final ) {
					let now = new Date().getTime();
					let totalTime = ( now - this.playerStatus.startTime ) / 1000;
					let minuteStr = Math.floor( totalTime / 60 ) + '';
					while ( minuteStr.length < 2 ) {
						minuteStr = '0' + minuteStr;
					}

					let secondStr = Math.floor( totalTime % 60 ) + '';
					while ( secondStr.length < 2 ) {
						secondStr = '0' + secondStr;
					}

					let timeStr = minuteStr + ':' + secondStr;

					this.messageQueue.push( 'All cores have been defeated! Congratulations!' );
					this.messageQueue.push( 'Your total time was ' + timeStr );
					this.messageQueue.push( 'Press W to return to the main menu' );

				} else {
					this.messageQueue.push( 'Press W to proceed' );	
				}

				this.anim.pushFrame( new AnimFrame( {
					'state': { value: LevelState.SUCCESS_MENU }
				} ) );

			} else {
				this.messages.push( 'complete' );
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

	/* User Interface */

	pickFromEye( dir: Vec2 ): Array<Entity> {
		let shapes = [];

		for ( let entity of this.em.entities ) {
			if ( entity == this.player ) continue;

			shapes.push( ...entity.getShapes( 0.0 ) );
		}

		let hits = shapecast( Line.fromPoints( this.player.pos.copy(), this.player.pos.plus( dir ) ), shapes );

		if ( hits.length > 0 ) {
			return [hits[0].shape.parent];
		}

		return [];
	}

	describe( entity: Entity, dir: Vec2 ) {
		if ( !entity ) {
			this.messageQueue.push( 'nothing' );
			return;
		}

		let msg = '';

		if ( entity.flavorName ) {
			msg = entity.flavorName;
		} else {
			msg = entity.constructor.name;
		}

		let attributes = [];

		if ( entity.collisionGroup == COL.LEVEL ) {
			attributes.push( 'Solid' );
		}

		let shapes = entity.getShapes( 0.0, { local: false } ); // entity might have a parent, so apply the parent transform

		for ( let shape of shapes ) {
			if ( shape.contains( this.player.pos ) ) {
				attributes.push( 'Inside' );
				break;
			}
		}

		//this.messageQueue.push( 'Vulnerable: unknown' );//+ this.player.canBeHitBy( entity ) );
		// fire direction of guns (straight, random)
		if ( entity.collisionGroup == COL.ENEMY_BULLET ) {
			attributes.push( 'Dangerous' );
		}

		if ( attributes.length ) msg += ' (' + attributes.join( ', ' ) + ')';

		this.messageQueue.push( msg );
	}

	/* Drawing */

	draw( context: CanvasRenderingContext2D, options: SceneDrawOptions={} ) {
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
				//this.appendReplayFrame( context );
			}

			this.defaultDraw( context );
			this.drawTextboxOverlay( context );

			if ( this.paused ) {
				this.drawPauseOverlay( context );
			}
		}

		if ( typeof document !== 'undefined' && !options.noConsole ) {
			// draw newest messages lowest
			let y = this.camera.viewportH - 20;
			let x = 10;

			// center of circle
			let textAreaWidth = this.ir * 2 * this.camera.viewportW / 400 * 0.9;

			// context.font = '14px Monospace';
			// let charWidth = context.measureText( 'm' ).width;

			// let lineWidthChars = Math.floor( textAreaWidth / charWidth );

			if ( !Debug.flags.DRAW_NORMAL ) {
				y = this.camera.viewportH / 2 + 20;
				x = this.camera.viewportW / 2 - textAreaWidth / 2;
			}

			for ( let i = this.displayText.length - 1; i >= this.displayText.length - 4 && i >= 0; i-- ) {
				whiteText( context, this.displayText[i], x, y );
				y -= 20;
			}
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
				shape.sphericalStroke( context, this.player.pos, ir, sliderVals.lens.val );
			}
		context.restore();
	}

	defaultDraw( context: CanvasRenderingContext2D, camera: Camera=this.camera ) {

		/* Prepare Scene */

		let origin = this.player.pos.copy();

		let ir = this.ir * camera.viewportW / 400;
		let or = this.or * camera.viewportW / 400;
		let haloW = this.haloWidth * camera.viewportW / 400;

		let shapes = this.getShapes();

		let sliceCount = parseInt( Debug.fields['SLICE_COUNT'].value );
		if ( isNaN( sliceCount ) ) sliceCount = 360;

		/* Draw Scene */

		if ( typeof document === 'undefined' ) {
			renderFromEye( context, shapes, origin, this.player.vel, sliceCount, or, ir );

			return;
		}

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

					renderFromEye( context, shapes, origin, this.player.vel, sliceCount, or, ir );

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
		if ( typeof document === 'undefined' ) return;

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
		if ( typeof document === 'undefined' ) return;

		context.fillStyle = 'hsl( 0, 0%, 90%)';
		context.font = '24px Arial';

		let text = 'P A U S E';
		let meas = context.measureText( text );
		let w = meas.width;
		let h = meas.actualBoundingBoxAscent + meas.actualBoundingBoxDescent;
		
		context.fillText( text, this.camera.viewportW / 2 - w / 2, this.camera.viewportH / 2 - 100 + h / 2 );
	}

	deathDraw( context: CanvasRenderingContext2D ) {
		if ( !Debug.flags.SHOW_DEATH ) return;
		if ( typeof document === 'undefined' ) return;

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