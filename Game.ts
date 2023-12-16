import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { DebugPanel } from './ctlr/DebugPanel.js'

import { MILLIS_PER_FRAME } from './collisionGroup.js'
import { GameController } from './GameController.js'
import { GameControllerDom } from './GameControllerDom.js'
import { empty } from './objDef.js'
import { whiteText } from './render.js'

import * as Debug from './Debug.js'

let ctlr: GameController = null;

let empty2 = empty; // use import so webpack doesn't ignore it

let count = 0;
function annotate( context: CanvasRenderingContext2D, v: Vec2 ) {
	context.beginPath();
	context.moveTo( v.x, v.y );
	context.lineTo( v.x + 20, v.y + 20 );
	context.stroke();

	whiteText( context, count + '', v.x + 20, v.y + 20 );
	count++;
}

let rightPanels: HTMLDivElement = null;
let scrollTop = 0;

let frameTime = 0;

let update = function() {
	let now = new Date().getTime();
	let fps = 1000 / ( now - frameTime );
	frameTime = now;

	if ( typeof document !== 'undefined' ) {

		// set tab title
		document.getElementsByTagName( 'title' )[0].innerHTML = Math.floor( fps * 1000 ) / 1000 + '';

		// debug commands
		if ( Keyboard.keyHit( KeyCode.P ) ) Debug.toggleFlag( 'DEBUG_MODE' );

		if ( Debug.flags.DEBUG_MODE ) {
			if ( Keyboard.keyHit( KeyCode.F ) ) Debug.toggleFlag( 'DRAW_NORMAL' );
			if ( Keyboard.keyHit( KeyCode.Y ) ) Debug.toggleFlag( 'DRAW_RAYS' );
			if ( Keyboard.keyHit( KeyCode.E ) && ctlr.currentScene ) ctlr.currentScene.messages.push( 'complete' );

			if ( Keyboard.keyHit( KeyCode.BSLASH ) ) {
				let put_a_breakpoint_here = 0;
			}
		
			if ( rightPanels.classList.contains( 'hidden' ) ) {
				rightPanels.classList.remove( 'hidden' );
			}

		} else {
			if ( !rightPanels.classList.contains( 'hidden' ) ) {
				rightPanels.classList.add( 'hidden' );
			}
		}
	}

	// we want as short a time as possible between input checks in ctlr.update() 
	// and Keyboard.updateState() because keypresses that happen in between 
	// will be counted as HELD and not HIT
	ctlr.update();
	Keyboard.updateState();

	ctlr.draw();
}

if ( typeof document !== 'undefined' ) {
	window.onload = function() {
		console.log( 'init from window' );

		// debug panel
		Debug.init();
		
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

		setInterval( update, MILLIS_PER_FRAME );
	}

	document.addEventListener( 'keydown', function( e: any ) {
		Keyboard.downHandler( e );
	} );

	document.addEventListener( 'keyup', function( e: any ) {
		Keyboard.upHandler( e );
	} );

	// right panel scroll control
	rightPanels = document.getElementById( 'rightPanelContainer' ) as HTMLDivElement;

	let rightScroll = document.getElementsByClassName( 'scroll-container' )[0] as HTMLDivElement;
	let rightPane = document.getElementsByClassName( 'rightpane' )[0] as HTMLDivElement;

	const callback = () => {
		let height = rightScroll.scrollHeight;

		rightScroll.style.height = Math.max( rightPanels.scrollHeight, height ) + 'px';
		scrollTop = rightPane.scrollTop;
	};

	const observer = new MutationObserver( callback );
	observer.observe( rightPanels, { attributeFilter: ['scrollHeight'] } );

	rightPane.onscroll = ( e: any ) => {
		let height = rightScroll.scrollHeight;
		let diff = Math.max( scrollTop - rightPane.scrollTop, 0 );

		rightScroll.style.height = Math.max( rightPanels.scrollHeight, height - diff ) + 'px';

		scrollTop = rightPane.scrollTop;
	}
} else {
	console.log( 'init from console' );

	ctlr = new GameController();

	setInterval( update, MILLIS_PER_FRAME );
}