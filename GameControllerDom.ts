import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Controller } from './lib/juego/Controller.js'
import { Entity } from './lib/juego/Entity.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { SessionManager } from './lib/juego/SessionManager.js'

import * as tp from './lib/toastpoint.js'

import { Level } from './Level.js'
import { constructors, nameMap } from './objDef.js'
import { store } from './store.js'

import { levelDataList } from './levels.js'
import { DeathScene } from './DeathScene.js'
import { FloaterScene } from './FloaterScene.js'
import { TitleScene } from './TitleScene.js'


class FadingImage {
	image: HTMLImageElement;
	fade: number = 1.0;

	constructor( image: HTMLImageElement ) {
		this.image = image;
	}
}

let oldImages: Array<FadingImage> = [];


let gameCommands: Array<CommandRef> = [];

// Save State
let c = new CommandRef( 'Save State 1', null, null, KeyCode.DIGIT_1, MOD.CTRL );
c.enter = function( this: GameControllerDom ) {
	let toaster = new tp.Toaster( constructors, nameMap );

	if ( this.manager.currentScene instanceof Level ) {
		let flatLevel = tp.toJSON( this.manager.currentScene, toaster );
		
		store['state_1'] = JSON.stringify( flatLevel );

		console.log( 'Saved state to slot 1' );

	} else {
		console.warn( 'Save State: Unhandled Scene type ' + 
			this.manager.currentScene.constructor.name );
	}

	toaster.cleanAddrIndex();
}
gameCommands.push( c );

// Load State
c = new CommandRef( 'Load State 1', null, null, KeyCode.DIGIT_1 );
c.enter = function( this: GameControllerDom ) {
	let toaster = new tp.Toaster( constructors, nameMap );

	if ( !store['state_1'] ) {
		console.warn( 'No state in slot 1' );
		return;
	}

	let json = JSON.parse( store['state_1'] );

	let level = tp.fromJSON( json, toaster );
	tp.resolveList( [level], toaster );
	
	for ( let entity of level['entities'] ) {
		level.em.insert( entity );
	}

	this.manager.currentScene = level as Level;

	console.log( 'Loaded state from slot 1' );
}
gameCommands.push( c );


export class GameControllerDom extends Controller {
	manager: SessionManager = new SessionManager();

	title: TitleScene = new TitleScene();
	deathScene: DeathScene = new DeathScene();

	canvas: HTMLCanvasElement = null;
	context: CanvasRenderingContext2D = null;

	levels: Array<Level> = [];
	levelIndex = 0;

	floaterScene: FloaterScene;
	startTime: number = 0;
	hue: number = Math.random() * 360;

	constructor() {
		super( gameCommands );

		this.canvas = document.getElementById( 'canvas' ) as HTMLCanvasElement;

		this.floaterScene = new FloaterScene( this.canvas );
		this.title.floaters = this.floaterScene.floaters;

		for ( let i = 0; i < levelDataList.length; i++ ) {
			this.levels.push( new Level( 'level' + i, levelDataList[i] ) );
		}

		this.initKeyboard();

		this.manager.useCanvas( this.canvas );

		document.addEventListener( "start", ( e: any ) => { 
			this.levelIndex = 0;

			this.manager.loadScene( this.levels[0] );
		} );

		document.addEventListener( "startBoss", ( e: any ) => { 
			this.levelIndex = 9;

			this.manager.loadScene( this.levels[9] );
		} );

		document.addEventListener( "restart", ( e: any ) => {
			this.manager.loadScene( this.levels[this.levelIndex] );
		} );

		document.addEventListener( "death", ( e: any ) => {
			this.manager.loadScene( this.deathScene );
		} );

		document.addEventListener( "complete", ( e: any ) => { 
			this.levelIndex += 1;

			if ( this.levelIndex < this.levels.length ) {
				let context = this.canvas.getContext( '2d' );

				context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
				this.manager.draw( context );

				var image = new Image();
				image.src = this.canvas.toDataURL();

				oldImages.push( new FadingImage( image ) );

				this.manager.loadScene( this.levels[this.levelIndex] );

			} else {
				oldImages = [];

				this.manager.loadScene( this.title );
			}
		} );
	}

	initKeyboard() {
		document.addEventListener( "keydown", ( e: KeyboardEvent ) => {

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

	update() {
		if ( Keyboard.keyHit( KeyCode.E ) ) {
			document.dispatchEvent( new CustomEvent( "complete" ) );
		}

		this.floaterScene.update();

		if ( this.manager.currentScene === null ) {
			this.manager.loadScene( this.title );
		}

		this.manager.update();

		this.manager.mouse.update( this.canvas );
	}

	draw( context?: CanvasRenderingContext2D ) {
		if ( !context ) {
			context = this.canvas.getContext( '2d' );

			context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
		}

		if ( !this.manager.currentScene ) return;

		// background
		if ( this.manager.currentScene == this.title || 
			 this.manager.currentScene == this.deathScene ) {
			this.floaterScene.draw( context );
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