import * as JuegoDebug from './lib/juego/Debug.js'
import { Entity } from './lib/juego/Entity.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Material } from './lib/juego/Material.js'
import { SessionManager } from './lib/juego/SessionManager.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { DeathScene } from './DeathScene.js'
import { Level } from './Level.js'
import { levelDataList } from './levels.js'
import { getDownsampled } from './render.js'
import { TitleScene } from './TitleScene.js'

import * as Debug from './Debug.js'

let title: TitleScene = new TitleScene();
let deathScene: DeathScene = new DeathScene();
let manager: SessionManager = new SessionManager();

let canvas: HTMLCanvasElement = null;
let context: CanvasRenderingContext2D = null;

let levels: Array<Level> = [];
let levelIndex = 0;

let floaters: Array<Entity> = [];
let startTime: number = 0;
let hue: number = Math.random() * 360;

title.floaters = floaters;

for ( let i = 0; i < levelDataList.length; i++ ) {
	levels.push( new Level( 'level' + i, levelDataList[i] ) );
}

window.onload = function() {
	console.log( "init" );

	canvas = document.getElementById( "canvas" ) as HTMLCanvasElement;
	context = canvas.getContext( "2d" );

	title.canvas = canvas;

	manager.useCanvas( canvas );

	setInterval( update, 60 );
}

document.addEventListener( "debug", function( e: any ) {
	if ( Debug.flags.DRAW_NORMAL ) {
		let elem: HTMLElement = document.getElementById( "debugtext" );

		elem.innerHTML = e.detail;
	}
} );

document.addEventListener( "entities", function( e: any ) {
	if ( Debug.flags.DRAW_NORMAL ) {
		let elem: HTMLElement = document.getElementById( "entities" );

		elem.innerHTML = e.detail;
	}
} );

document.addEventListener( "keydown", function( e: any ) {
	Keyboard.downHandler( e );
} );

document.addEventListener( "keyup", function( e: any ) {
	Keyboard.upHandler( e );
} );

document.addEventListener( "start", function( e: any ) { 
	levelIndex = 0;

	manager.loadScene( levels[0] );
} );

document.addEventListener( "startBoss", function( e: any ) { 
	levelIndex = 9;

	manager.loadScene( levels[9] );
} );

document.addEventListener( "restart", function( e: any ) {
	manager.loadScene( levels[levelIndex] );
} );

document.addEventListener( "death", function( e: any ) {
	manager.loadScene( deathScene );
} );

let debugDiv = document.getElementById( 'debug' );

for ( let flagName in JuegoDebug.Debug as any ) {
	let div = document.createElement( 'div' );
	div.textContent = flagName;

	let input = document.createElement( 'input' );
	input.type = 'checkbox';

	let name = flagName;
	input.addEventListener( 'change', function( e: any ) {
		 ( JuegoDebug as any ).Debug[name] = input.checked;
	} );

	div.appendChild( input )
	debugDiv.appendChild( div );
}

for ( let flagName in Debug.flags ) {
	let div = document.createElement( 'div' );
	div.textContent = flagName;

	let input = document.createElement( 'input' );
	input.type = 'checkbox';

	let name = flagName;
	input.addEventListener( 'change', function( e: any ) {
		Debug.flags[name] = input.checked;
	} );

	div.appendChild( input )
	debugDiv.appendChild( div );
}

class FadingImage {
	image: HTMLImageElement;
	fade: number = 1.0;

	constructor( image: HTMLImageElement ) {
		this.image = image;
	}
}

let oldImages: Array<FadingImage> = [];

document.addEventListener( "complete", function( e: any ) { 
	levelIndex += 1;

	if ( levelIndex < levels.length ) {
		context.clearRect( 0, 0, canvas.width, canvas.height );
		manager.draw( context );

		var image = new Image();
		image.src = canvas.toDataURL();

		oldImages.push( new FadingImage( image ) );

		manager.loadScene( levels[levelIndex] );
	} else {
		oldImages = [];

		manager.loadScene( title );
	}
} );

let update = function() {
	if ( Keyboard.keyHit( KeyCode.D ) ) {
		if ( Debug.flags.DRAW_NORMAL ) {
			Debug.flags.DRAW_NORMAL = false;
 		} else {
 			Debug.flags.DRAW_NORMAL = true;
 		}
	}

	if ( Keyboard.keyHit( KeyCode.E ) ) {
		document.dispatchEvent( new CustomEvent( "complete" ) );
	}

	if ( manager.currentScene === null ) {
		manager.loadScene( title );
	}

	manager.update();

	if ( new Date().getTime() - startTime > 1000 && floaters.length < 10 ) {
		startTime = new Date().getTime();

		let angle = Math.random() * Math.PI * 2;
		let speed = Math.random() * 5 + 1;
		let origin = new Vec2( 200, 200 );

		let floater = new Entity( origin.plus( Vec2.fromPolar( angle, 400 ) ),
								  Math.random() * 80 + 10, Math.random() * 80 + 10 );

		if ( floaters.length > 0 ) {
			let deg = Math.PI / 180;
			angle += Math.random() * deg*40  - deg*20;
		}

		floater.vel = new Vec2( -Math.cos( angle ) * speed, -Math.sin( angle ) * speed );
		floater.material = new Material( hue, 1.0, 0.5 );

		hue += Math.random() * 3 + 3;

		floaters.push( floater );
	}

	for ( let floater of floaters ) {
		floater.pos.add( floater.vel );
	}

	for ( let i = floaters.length - 1; i >= 0; i-- ) {
		if ( new Vec2( floaters[i].pos.x - 200, floaters[i].pos.y - 200 ).length() > 500 ) {
			floaters.splice( i, 1 );
		} 
	}

	context.clearRect( 0, 0, canvas.width, canvas.height );

	// background
	context.globalAlpha = 0.1;

	if ( manager.currentScene == title || manager.currentScene == deathScene ) {
		for ( let floater of floaters ) {
			floater.draw( context );
		}
	}

	if ( canvas !== null ) {
		let data = getDownsampled( canvas, context, 16 );
		context.putImageData( data, 0, 0 );
	}

	context.globalAlpha = 1.0;

	// scene
	if ( manager.currentScene !== null ) {
		// current level
		manager.draw( context );

		// previous level fadeout
		context.save();
		context.translate( canvas.width / 2, canvas.height / 2 );
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

	Keyboard.updateState();
	manager.mouse.update( canvas );	
}