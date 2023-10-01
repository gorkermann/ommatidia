import { Chrono } from './lib/juego/Anim.js'
import { Camera } from './lib/juego/Camera.js'
import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Controller } from './lib/juego/Controller.js'
import { Entity } from './lib/juego/Entity.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { SessionManager } from './lib/juego/SessionManager.js'

import * as tp from './lib/toastpoint.js'

import { Level } from './Level.js'
import { constructors, nameMap } from './objDef.js'
import { store } from './store.js'

import { REWIND_SECS } from './collisionGroup.js'
import { gameCommands } from './gameCommands.js'
import { levelDataList } from './levels.js'
import { DeathScene } from './DeathScene.js'
import { FloaterScene } from './FloaterScene.js'
import { TitleScene } from './TitleScene.js'

tp.config.WRITE_PTR_CLASSNAME = true;

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

export class GameControllerDom extends Controller {
	manager: SessionManager = new SessionManager();

	title: TitleScene = new TitleScene();
	deathScene: DeathScene = new DeathScene();

	canvas: HTMLCanvasElement = null;
	context: CanvasRenderingContext2D = null;

	levelIndex: number = 0;

	floaterScene: FloaterScene;
	hue: number = Math.random() * 360;

	recentStates: Array<any> = [];
	saveStateInterval: number = 1000;
	lastStateTime: number = 0; // milliseconds of play time since scene started

	camera: Camera = new Camera();

	constructor() {
		super( gameCommands );

		this.initCanvas();

		this.title.useCamera( this.camera );

		this.floaterScene = new FloaterScene( this.canvas );
		this.floaterScene.useCamera( this.camera );

		this.title.floaters = this.floaterScene.floaters;

		this.initKeyboard();

		this.manager.useCanvas( this.canvas );

		document.addEventListener( 'start', ( e: any ) => { 
			this.levelIndex = 0;

			this.startLevel();
		} );

		document.addEventListener( 'restart', ( e: any ) => {
			this.startLevel();
		} );

		document.addEventListener( 'rewind', ( e: any ) => {
			if ( this.recentStates.length == 0 ) {
				this.startLevel();

			} else {
				let json = this.recentStates[0];

				this.loadLevelFromJSON( json );
			}
		} );

		document.addEventListener( 'death', ( e: any ) => {
			this.manager.loadScene( this.deathScene );
		} );

		document.addEventListener( 'complete', ( e: any ) => { 
			this.levelIndex += 1;

			if ( this.levelIndex < levelDataList.length ) {
				let context = this.canvas.getContext( '2d' );

				context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
				this.manager.draw( context );

				var image = new Image();
				image.src = this.canvas.toDataURL();

				oldImages.push( new FadingImage( image ) );

				this.startLevel();

			} else {
				oldImages = [];

				this.manager.loadScene( this.title );
			}
		} );
	}

	initCanvas() {
		this.canvas = document.getElementById( 'canvas' ) as HTMLCanvasElement;
		this.resize();

		window.addEventListener( 'resize', ( e ) => {
			this.resize();
		} );
	}

	startLevel() {
		try {
			let level = new Level( 'level' + this.levelIndex, levelDataList[this.levelIndex] );

			this.recentStates = [];
			this.lastStateTime = 0;

			this.manager.loadScene( level );
			this.manager.currentScene.useCamera( this.camera );

		} catch ( e ) {
			this.manager.currentScene = null;

			throw e;
		}
	}

	initKeyboard() {
		document.addEventListener( 'keydown', ( e: KeyboardEvent ) => {

			// Select input mode
			let foundCommand = false;

			for ( let command of this.commandList ) {
				if ( command.tryEnter( this, e ) ) {
					if ( foundCommand ) {
						throw new Error( 'Multiple commands triggered by keyboard event' );
					}

					foundCommand = true;
				}
			}

			if ( !foundCommand ) {
				// do nothing
			}
		} );	
	}

	getJSON(): any {
		let toaster = new tp.Toaster( constructors, nameMap );
		let scene = this.manager.currentScene;

		let output = null;

		if ( scene instanceof Level ) {
			let flatLevel = tp.toJSON( scene, toaster );

			if ( toaster.errors.length > 0 ) {
				for ( let error of toaster.errors ) {
					console.error( error );
				}
			} else {
				output = flatLevel;
			}

		} else {
			console.warn( 'GameControllerDom.getJSON: Unhandled Scene type ' + 
				scene.constructor.name );
		}

		toaster.cleanAddrIndex();

		if ( output ) {
			output['levelIndex'] = this.levelIndex;
		}

		return output;
	}

	loadLevelFromJSON( json: any, options: LoadLevelOptions={} ) {
		let toaster = new tp.Toaster( constructors, nameMap );

		let level = tp.fromJSON( json, toaster );
		tp.resolveList( [level], toaster );
		
		for ( let error of toaster.errors ) {
			console.error( error );
			return;
		}

		for ( let entity of level['__entities'] ) {
			entity.init();
			level.em.insert( entity );
		}

		delete level['__entities'];

		if ( this.manager.currentScene !== null ) {
			this.manager.currentScene.sleep();
		}
		this.manager.currentScene = level as Level;
		this.manager.currentScene.useCamera( this.camera );

		let sameLevel = false;
		if ( 'levelIndex' in json ) {
			sameLevel = ( json['levelIndex'] == this.levelIndex );

			this.levelIndex = json['levelIndex'];
		}

		if ( sameLevel && !options.forceEraseHistory ) {
			this.recentStates = this.recentStates.slice( 0, 1 );
			this.lastStateTime = ( this.manager.currentScene as Level ).elapsedTotal;
		} else {
			this.recentStates = [];
			this.lastStateTime = 0;
		}
	}

	update() {
		if ( this.manager.currentScene === null ) {
			this.manager.loadScene( this.title );
		}

		// save recent game states
		if ( this.manager.currentScene instanceof Level && 
			 this.manager.currentScene.elapsedTotal - this.lastStateTime > this.saveStateInterval ) {

			let json = this.getJSON();

			if ( json ) {
				this.recentStates.push( json );

				console.log( 'pushed state at ' + this.manager.currentScene.elapsedTotal );
			}

			// keep only the most recent states
			if ( this.recentStates.length > REWIND_SECS ) {
				this.recentStates = this.recentStates.slice( -REWIND_SECS );
			}

			this.lastStateTime = this.manager.currentScene.elapsedTotal;
		}

		this.floaterScene.update();

		this.manager.update();

		this.manager.mouse.update( this.canvas );
	}

	resize() {
		let drawarea = document.getElementById( 'drawarea' );

		let h = drawarea.getBoundingClientRect().height;
		this.canvas.height = h;

		if ( h > 400 ) {
			this.canvas.height = h;
		} else {
			this.canvas.height = 400;
		}

		this.canvas.width = this.canvas.height;

		this.camera.setViewport( this.canvas.width, this.canvas.height );
	}

	draw( context?: CanvasRenderingContext2D ) {
		if ( !context ) {
			context = this.canvas.getContext( '2d' );
		}

		context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		if ( !this.manager.currentScene ) return;

		// background
		if ( this.manager.currentScene == this.title || 
			 this.manager.currentScene == this.deathScene ) {

			context.save();
				context.translate( -this.title.origin.x, -this.title.origin.y );
				this.floaterScene.draw( context );
			context.restore();
		}

		// current scene
		this.manager.draw( context );

		// previous level fadeout
		context.save();
			context.translate( this.canvas.width / 2, this.canvas.height / 2 );
			for ( let data of oldImages ) {
				context.globalAlpha = data.fade;
				context.scale( 0.8 + data.fade * 0.2, 0.8 + data.fade * 0.2 );

				context.drawImage( data.image, -data.image.width / 2, -data.image.height / 2 );

				data.fade -= 0.1;
			}

			for ( let i = oldImages.length - 1; i >= 0; i-- ) {
				if ( oldImages[i].fade <= 0 ) {
					oldImages.splice( i, 1 );
				}
			}

			context.globalAlpha = 1.0;
		context.restore();
	}
}