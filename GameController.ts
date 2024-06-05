import { Camera } from './lib/juego/Camera.js'
import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Controller } from './lib/juego/Controller.js'
import { Editable } from './lib/juego/Editable.js'
import { Entity } from './lib/juego/Entity.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { constructors, nameMap } from './lib/juego/constructors.js'
import { Selector } from './lib/juego/Selector.js'
import { Dict } from './lib/juego/util.js'
import { Vec2 } from './lib/juego/Vec2.js'

import * as tp from './lib/toastpoint.js'
 
import { BareMode } from './mode/BareMode.js'
import * as Debug from './Debug.js'
import { gameCommands } from './gameCommands.js'
import { Level } from './Level.js'
import { SideLevel } from './SideLevel.js'
import { levelDataList as levels } from './levels/level1.js'
import { levelDataList as sideLevels } from './levels/sideLevels.js'
import { OmmatidiaScene } from './Scene.js'
import { store } from './store.js'
import { TitleScene } from './TitleScene.js'
import { PlayerStatus } from './Player.js'
import { Watcher, DictWatcher } from './Watcher.js'

import { clearLcdQueue, sendLcdByte } from './lcd.js'

tp.config.WRITE_PTR_CLASSNAME = true;

let levelDataList = sideLevels;

class FadingImage {
	image: HTMLImageElement;
	fade: number = 1.0;

	constructor( image: HTMLImageElement ) {
		this.image = image;
	}
}

let oldImages: Array<FadingImage> = [];

type LoadLevelOptions = {
	forceEraseHistory?: boolean
}

let domHoverlist: Array<Entity> = [];

type ResetInterfaceOptions = {
	soft?: boolean;
}

type MessageHandler = {
	name: string,
	func: ( args: Array<string> ) => void
}

export type StartLevelOptions = {
	retry?: boolean
}

export class GameController extends Controller {
	messageHandlers: Array<MessageHandler> = [];

	currentScene: OmmatidiaScene = null;

	title: TitleScene = new TitleScene();

	levelDataList: any = levelDataList;
	levelIndex: number = 0;
	offsetIndex: number = 0;

	recentStates: Array<any> = [];
	saveStateInterval: number = 1000;
	lastStateTime: number = 0; // milliseconds of play time since scene started

	playerStatus: PlayerStatus = {
		startTime: 0,
		lives: 10,
		defeatedNames: [],
		messages: ['Note: You can identify objects by clicking them with the mouse']
	}

	exitRequestTime: number = -1;
	exitWaitInterval: number = 2000;

	/* property overrides */

	defaultMode = 'Play';

	constructor() {
		super( [] );

		this.canvas = null;

		this.changeMode( new BareMode() ); // change to PlayMode to get back drag actions

		this.addMessageHandler( 'start', () => { 
			this.levelIndex = 0 + this.offsetIndex;
			this.playerStatus.startTime = new Date().getTime();

			this.startLevel();
		} );

		this.addMessageHandler( 'restart', () => {
			this.startLevel();
		} );

		this.addMessageHandler( 'rewind', () => {
			if ( this.recentStates.length == 0 ) {
				this.startLevel();

			} else {
				let json = this.recentStates[0];

				this.loadLevelFromJSON( json );
			}
		} );

		this.addMessageHandler( 'death', () => {
			this.startLevel( { retry: true } );
		} );

		if ( typeof document === 'undefined' ) {
			this.addMessageHandler( 'complete', () => {
				this.levelIndex += 1;

				if ( this.levelIndex < this.levelDataList.length ) {
					this.startLevel();

				} else {
					oldImages = [];

					this.loadScene( this.title );
				}
			} );
		}

		this.addMessageHandler( 'begin', ( args: Array<string> ) => {
			if ( args.length != 1 ) {
				console.error( 'message.begin: Invalid arguments ' + args );
				return;
			}

			let index = parseInt( args[0] );

			if ( isNaN( index ) ) {
				console.error( 'message.begin: Invalid index ' + args[0] );
			}

			this.levelIndex = index;
			this.startLevel();
		} );
	}

	addMessageHandler( name: string, func: ( args: Array<string> ) => void ) {
		this.messageHandlers.push( { name: name, func: func } );
	}

	/* save */

	getJSON(): any {
		//let toaster = new tp.Toaster( constructors, nameMap );
		let scene = this.currentScene;

		let output = null;

		if ( scene instanceof Level ) {
			try {
				let flatLevel = tp.singleToJSON( scene, constructors, nameMap );

				output = flatLevel;
			} catch ( ex ) { 
				console.error( ex );
			}

		} else {
			console.warn( 'GameControllerDom.getJSON: Unhandled Scene type ' + 
				scene.constructor.name );
		}

		//toaster.cleanAddrIndex();

		if ( output ) {
			output['levelIndex'] = this.levelIndex;
		}

		return output;
	}

	/* load */

	resetInterface( options: ResetInterfaceOptions={} ) {}

	startLevel( options: StartLevelOptions={} ) {
		try {
			let level: OmmatidiaScene;

			if ( this.levelDataList[this.levelIndex].controlMode == 0 ) {
				level = new SideLevel( 'Level ' + ( this.levelIndex + 1 ), this.levelDataList[this.levelIndex], options.retry );
				level.playerStatus = this.playerStatus;
				if ( this.levelIndex == this.levelDataList.length - 1 ) level.final = true; 
			} else {
				level = new Level( 'level' + this.levelIndex, this.playerStatus, this.levelDataList[this.levelIndex] );
				if ( this.playerStatus.defeatedNames.length == 5 ) level.final = true;
			}

			this.loadScene( level );
			this.resetInterface();

		} catch ( e ) {
			this.currentScene = null;

			throw e;
		}
	}

	loadLevelFromJSON( json: any, options: LoadLevelOptions={} ) {
		let toaster = new tp.Toaster( constructors, nameMap );

		let level = tp.fromJSON( json, toaster );
		
		for ( let error of toaster.errors ) {
			console.error( error );
			return;
		}

		for ( let entity of level['__entities'] ) {
			entity.init();
			level.em.insert( entity );
		}

		delete level['__entities'];

		// check if we are in the same level as previously
		let sameLevel = false;
		if ( 'levelIndex' in json ) {
			sameLevel = ( json['levelIndex'] == this.levelIndex );

			this.levelIndex = json['levelIndex'];
		}

		this.loadScene( level, false );
		this.resetInterface( { soft: sameLevel && !options.forceEraseHistory } );
	}

	loadScene( scene: OmmatidiaScene, doLoad: boolean=true ) {
		if ( doLoad ) {
			scene.load();
		}
		this.currentScene = scene;
		this.camera = scene.camera;
	}

	/* play */

	inspect( targets: Array<Editable> ) {}

	updateHovered() {}

	update() {
		if ( this.currentScene === null ) {
			this.loadScene( this.title );
		}

		if ( this.currentScene.messages.length > 1 ) {
			console.warn( 'GameController.update(): Evaluating multiple messages ' + 
						  this.currentScene.messages.join( ',' ) );
		}

		let scene = this.currentScene;
		for ( let message of scene.messages ) {
			let words = message.split( ' ' );

			if ( words[0] ) {
				for ( let handler of this.messageHandlers ) {
					if ( handler.name == words[0] ) {
						handler.func( words.slice( 1 ) );	
					}
				}
			} else {
				console.error( 'GameController.update(): Unhandled message type ' + message );
			}
		}
		scene.messages = []; // use temp variable as this.currentScene may have changed

		if ( Keyboard.keyHeld( KeyCode.LEFT ) &&
			 Keyboard.keyHeld( KeyCode.RIGHT ) &&
			 Keyboard.keyHeld( KeyCode.Q ) &&
			 Keyboard.keyHeld( KeyCode.W ) ) {
			
			if ( this.exitRequestTime < 0 ) {
				this.exitRequestTime = new Date().getTime();
				clearLcdQueue();

				sendLcdByte( false, 0x01 ); // clear
				sendLcdByte( false, 0x02 ); // return

				let str = 'Resetting in ' + ( this.exitWaitInterval / 1000 ) + 's';
				for ( let i = 0; i < str.length; i++ ) {
					sendLcdByte( true, str.charCodeAt( i ) );
				}
			}
		} else {
			if ( this.exitRequestTime >= 0 ) {
				sendLcdByte( false, 0x01 ); // clear
				sendLcdByte( false, 0x02 ); // return

				let str = 'Reset canceled';
				for ( let i = 0; i < str.length; i++ ) {
					sendLcdByte( true, str.charCodeAt( i ) );
				}
			}

			this.exitRequestTime = -1;
		}

		if ( this.exitRequestTime >= 0 && new Date().getTime() - this.exitRequestTime > this.exitWaitInterval ) {
			this.loadScene( this.title );
			this.exitRequestTime = -1;
		}

		if ( this.mode ) {
			this.mode.update( this );
		}
	}

	draw( context?: CanvasRenderingContext2D ) {
		this.currentScene.draw( context );
	}
}