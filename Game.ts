import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { MILLIS_PER_FRAME } from './collisionGroup.js'
import { GameControllerDom } from './GameControllerDom.js'
import { empty } from './objDef.js'
import { DebugPanel } from './Panel.js'
import { whiteText } from './render.js'

import * as Debug from './Debug.js'

let ctlr: GameControllerDom;

let empty2 = empty;

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
	console.log( 'init' );

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

	let rightPane = document.getElementById( 'debugpanel' );

	let debugPanel = new DebugPanel();
	debugPanel.tryUpdate( ctlr, new Date().getTime() + '' );

	rightPane.appendChild( debugPanel.dom );

	setInterval( update, MILLIS_PER_FRAME );
}

document.addEventListener( 'keydown', function( e: any ) {
	Keyboard.downHandler( e );
} );

document.addEventListener( 'keyup', function( e: any ) {
	Keyboard.upHandler( e );
} );

let debugPanel = document.getElementById( 'debugpanel' );

debugPanel.addEventListener( 'keydown', function( e: any ) {
	e.stopPropagation();
} );

debugPanel.addEventListener( 'keyup', function( e: any ) {
	e.stopPropagation();
} );

let frameTime = 0;
let scrollTop = 0;

let update = function() {

	// set tab title
	let now = new Date().getTime();
	let fps = 1000 / ( now - frameTime );

	document.getElementsByTagName( 'title' )[0].innerHTML = Math.floor( fps * 1000 ) / 1000 + '';
	frameTime = now;

	// debug commands
	if ( Keyboard.keyHit( KeyCode.P ) ) Debug.toggleFlag( 'DEBUG_MODE' );

	if ( Debug.flags.DEBUG_MODE ) {
		if ( Keyboard.keyHit( KeyCode.D ) ) Debug.toggleFlag( 'DRAW_NORMAL' );
		if ( Keyboard.keyHit( KeyCode.Y ) ) Debug.toggleFlag( 'DRAW_RAYS' );
		if ( Keyboard.keyHit( KeyCode.E ) ) document.dispatchEvent( new CustomEvent( 'complete' ) );

		if ( Keyboard.keyHit( KeyCode.BSLASH ) ) {
			let put_a_breakpoint_here = 0;
		}
	
		if ( debugPanel.classList.contains( 'hidden' ) ) {
			debugPanel.classList.remove( 'hidden' );
		}

	} else {
		if ( !debugPanel.classList.contains( 'hidden' ) ) {
			debugPanel.classList.add( 'hidden' );
		}
	}

	let container = document.getElementsByClassName( 'scroll-container' )[0] as HTMLDivElement;
	let rightPane = document.getElementsByClassName( 'rightpane' )[0] as HTMLDivElement;

	// Options for the observer (which mutations to observe)
	const config = { attributeFilter: ['scrollHeight'] };

	// Callback function to execute when mutations are observed
	const callback = () => {
		container.style.height = Math.max( container.scrollHeight, debugPanel.scrollHeight ) + 'px';
		scrollTop = rightPane.scrollTop;
	};

	// Create an observer instance linked to the callback function
	const observer = new MutationObserver( callback );

	// Start observing the target node for configured mutations
	observer.observe( debugPanel, config );

	rightPane.onscroll = ( e: any ) => {
		let height = container.scrollHeight;
		let diff = Math.max( scrollTop - rightPane.scrollTop, 0 );

		container.style.height = Math.max( debugPanel.scrollHeight, height - diff ) + 'px';

		scrollTop = rightPane.scrollTop;
	}

	// want as short a time as possible between input checks in ctlr.update() and Keyboard.updateState()
	ctlr.update();
	Keyboard.updateState();

	ctlr.draw();
}