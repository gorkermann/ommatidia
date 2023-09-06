import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { GameControllerDom } from './GameControllerDom.js'

import * as Debug from './Debug.js'

let ctlr: GameControllerDom;

window.onload = function() {
	console.log( "init" );

	ctlr = new GameControllerDom();

	// debug panel
	Debug.init();

	let debugDiv = document.getElementById( 'debug' );
	debugDiv.appendChild( Debug.createDOMPanel() );

	setInterval( update, 60 );
}

document.addEventListener( "keydown", function( e: any ) {
	Keyboard.downHandler( e );
} );

document.addEventListener( "keyup", function( e: any ) {
	Keyboard.upHandler( e );
} );

let frameTime = 0;

let update = function() {
	let now = new Date().getTime();
	let fps = 1000 / ( now - frameTime );

	document.getElementsByTagName( 'title' )[0].innerHTML = Math.floor( fps * 1000 ) / 1000 + '';
	frameTime = now;

	if ( Keyboard.keyHit( KeyCode.D ) ) Debug.toggleFlag( 'DRAW_NORMAL' );

	if ( Keyboard.keyHit( KeyCode.BSLASH ) ) {
		let put_a_breakpoint_here = 0;
	}

	ctlr.update();
	ctlr.draw();

	Keyboard.updateState();
}