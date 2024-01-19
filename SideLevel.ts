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

import { Coin } from './Coin.js'

import { RoomManager } from './RoomManager.js'
import { Scene } from './Scene.js'

import { Bullet, PlayerBullet } from './Bullet.js'
import { CenteredEntity } from './CenteredEntity.js'
import { COL, MILLIS_PER_FRAME, REWIND_SECS } from './collisionGroup.js'
import { Player } from './Player.js'
import { shapecast, renderFromEye, renderRays, whiteText, vals } from './render.js'

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

export class SideLevel extends Scene {
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
	
	cursorPos: Vec2 = new Vec2( 0, 0 );
	
	healthBar: number = 0;
	healthBarMax: number = 0;
	haloWidth: number = 40;

	oldTime: number = 0;
	elapsedTotal: number = 0;

	ir: number = 300;
	or: number = 320;

	state: LevelState = LevelState.DEFAULT;

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
		'state': new AnimField( this, 'state', 0 ),
	},
	new AnimFrame( {
		'healthBar': { value: 0 },
		'haloWidth': { value: 40 },
		'or': { value: 120 },
		'ir': { value: 100},
	} ) );

	discardFields: Array<string> = ['em', 'textBox', 'textBoxHeight', 'text', 'textIndex', 'speaker',
					 'updateQueue', 'boundKeyHandler', 'cursorPos', 'oldTime',
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
			'or': { value: 120, expireOnReach: true } } ) );
		this.anim.pushFrame( new AnimFrame( { 
			'ir': { value: 100, expireOnReach: true } } ) );

		return new Promise( function(resolve, reject) {
			resolve(0);
		});
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

			if ( this.messageAnim.isDone() ) {
				if ( this.messageQueue.length > 0 ) {
					if ( this.stringIndex == 0 ) {
						this.displayText.push( '' );
					}

					if ( this.stringIndex >= this.messageQueue[0].length ) {
						this.stringIndex = 0;
						this.messageQueue.shift();

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
		}

		if ( this.state == LevelState.DEATH_REPLAY ) {
			// do nothing, anim only

		} else if ( this.state == LevelState.DEATH_MENU ) {
			if ( Keyboard.keyHit( KeyCode.R ) ) this.messages.push( 'restart' );
			if ( Keyboard.keyHit( KeyCode.Z ) ) this.messages.push( 'rewind' );

		} else if ( this.state == LevelState.SUCCESS_MENU ) {
			if ( Keyboard.keyHit( KeyCode.Z ) ) this.messages.push( 'complete' );

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

			if ( this.paused ) {
				this.oldTime = new Date().getTime();
			} else {
				this.defaultUpdate( frameStep, elapsed );
			}
		}
	}

	updateSounds() {
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

		this.player.vel.x = 0;
		if ( this.player.collideDown ) this.player.vel.y = 0;

		// left/right
		if ( Keyboard.keyHeld( KeyCode.LEFT ) ) {
			this.player.vel.x = -5;
		}

		if ( Keyboard.keyHeld( KeyCode.RIGHT ) ) {
			this.player.vel.x = 5;
		}

		// up/down
		if ( this.player.collideDown ) {
			this.player.jumpFrames = this.player.maxJumpFrames;
		} else {
			this.player.vel.y += this.grav.y;
		}

		if ( Keyboard.keyHeld( KeyCode.Z ) && this.player.collideDown ) {
			this.player.jumping = true;
		}

		if ( Keyboard.keyHeld( KeyCode.Z ) && this.player.jumping && this.player.jumpFrames > 0 ) {
			this.player.vel.y = -5;
			this.player.jumpFrames -= 1;

		} else {
			this.player.jumping = false;
		}

		this.player.vel.y += this.grav.y;

		// insert player bullets
		this.em.insertSpawned();
		this.em.updateShapeCache();

		Debug.strokeAll( this.em.entities );

		let treeGroup: Array<number> = this.em.entities.map( x => x.treeCollisionGroup() );
		let treeMask: Array<number> = this.em.entities.map( x => x.treeCollisionMask() );

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

			if ( entity instanceof Player ) {
				if ( entity.messages.length > 0 ) {
					this.messageQueue = this.messageQueue.concat( entity.messages );
					entity.messages = [];
				}
			}
		}

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

		this.player.collideDown = false;
		for ( let dir of result.blockedDirs ) {
			if ( dir.dot( this.grav ) < 0 ) this.player.collideDown = true;
		}

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
						this.messages.push( 'death' );
						
					} else if ( entity instanceof Bullet ) {
						entity.removeThis = true;
					}
				}
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
			this.messages.push( 'complete' );
		}
	}

	getShapes(): Array<Shape> {
		let shapes = [];

		for ( let entity of this.em.entities ) {
			shapes.push( ...entity.getShapes( 0.0 ) );
		}

		return shapes;
	}

	pickFromEye( dir: Vec2 ): Array<Entity> { return [] }

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
				//this.appendReplayFrame( context );
			}

			this.defaultDraw( context );
			this.drawTextboxOverlay( context );

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
	}

	defaultDraw( context: CanvasRenderingContext2D, camera: Camera=this.camera ) {

		/* Prepare Scene */

		let origin = this.player.pos.copy();

		let ir = this.ir * camera.viewportW / 400;
		let or = this.or * camera.viewportW / 400;
		let haloW = this.haloWidth * camera.viewportW / 400;

		let shapes = this.getShapes();
		let shapesMinusPlayer = [];

		for ( let entity of this.em.entities ) {
			if ( entity == this.player ) continue;

			shapesMinusPlayer.push( ...entity.getShapes( 0.0 ) );
		}

		let sliceCount = parseInt( Debug.fields['SLICE_COUNT'].value );
		if ( isNaN( sliceCount ) ) sliceCount = 360;

		/* Draw Scene */

		if ( typeof document === 'undefined' ) {
			renderFromEye( context, shapesMinusPlayer, origin, this.player.vel, sliceCount, or, ir );

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
			if ( Debug.flags.DRAW_FROM_EYE ) {
				let shapesMinusPlayer = [];

				for ( let entity of this.em.entities ) {
					if ( entity == this.player ) continue;

					shapesMinusPlayer.push( ...entity.getShapes( 0.0 ) );
				}

				context.save();
					context.translate( this.camera.viewportW / 2, this.camera.viewportH / 2 );

					renderFromEye( context, shapesMinusPlayer, origin, this.player.vel, sliceCount, or, ir );

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

	deathDraw( context: CanvasRenderingContext2D ) {}
}