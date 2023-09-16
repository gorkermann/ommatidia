import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { GameControllerDom } from './GameControllerDom.js'
import { MILLIS_PER_FRAME } from './collisionGroup.js'

import { whiteText } from './render.js'

import * as Debug from './Debug.js'

let ctlr: GameControllerDom;

let count = 0;
function annotate( context: CanvasRenderingContext2D, v: Vec2 ) {
	context.beginPath();
	context.moveTo( v.x, v.y );
	context.lineTo( v.x + 20, v.y + 20 );
	context.stroke();

	whiteText( context, count + '', v.x + 20, v.y + 20 );
	count++;
}

window.onload = function() {
	console.log( "init" );

	ctlr = new GameControllerDom();

	( window as any ).canvas = document.getElementById( 'canvas' );
	( window as any ).context = ( window as any ).canvas.getContext( '2d' );
	( window as any ).plot = function( v: any ) {
		( window as any ).context.strokeStyle = 'green';
		( window as any ).context.lineWidth = 1;

		if ( v instanceof Array ) {
			for ( let p of v ) {
				annotate( ( window as any ).context, p );
			}
		} else {
			annotate( ( window as any ).context, v );
		}
	}

	// debug panel
	Debug.init();

	let debugDiv = document.getElementById( 'debug' );
	debugDiv.appendChild( Debug.createDOMPanel() );

	setInterval( update, MILLIS_PER_FRAME );
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
	if ( Keyboard.keyHit( KeyCode.R ) ) Debug.toggleFlag( 'DRAW_RAYS' );

	if ( Keyboard.keyHit( KeyCode.BSLASH ) ) {
		let put_a_breakpoint_here = 0;
	}

	ctlr.update();
	ctlr.draw();

	Keyboard.updateState();
}