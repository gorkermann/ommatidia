import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Dict } from './lib/juego/util.js'

import * as tp from './lib/toastpoint.js'

import { GameControllerDom } from './GameControllerDom.js'
import { Level } from './Level.js'
import { constructors, nameMap } from './objDef.js'
import { store } from './store.js'

import { PlayMode } from './mode/PlayMode.js'
import { DragMode } from './mode/DragMode.js'

export let gameCommands: Array<CommandRef> = [];

gameCommands.push( new CommandRef( 'Play', null, PlayMode, null ) );
gameCommands.push( new CommandRef( 'Drag', PlayMode, DragMode, null ) );

let codeByDigit: Dict<KeyCode> = {
	0: KeyCode.DIGIT_0,
	1: KeyCode.DIGIT_1,
	2: KeyCode.DIGIT_2,
	3: KeyCode.DIGIT_3,
	4: KeyCode.DIGIT_4,
	5: KeyCode.DIGIT_5,
	6: KeyCode.DIGIT_6,
	7: KeyCode.DIGIT_7,
	8: KeyCode.DIGIT_8,
	9: KeyCode.DIGIT_9,
}

for ( let i in codeByDigit ) {

	// Save State
	let c = new CommandRef( 'Save State ' + i, null, null, codeByDigit[i], MOD.CTRL );
	c.enter = function( this: GameControllerDom ) {
		let json = this.getJSON();

		if ( json ) {
			let str = JSON.stringify( json );
			store['state_' + i] = str;

			console.log( 'Saved state to slot ' + i + ' (' + str.length + ')' );

		} else {
			console.error( 'Save State: Failed to create state' );
		}
	}
	gameCommands.push( c );


	// Load State
	c = new CommandRef( 'Load State ' + i, null, null, codeByDigit[i] );
	c.enter = function( this: GameControllerDom ) {
		if ( !store['state_' + i] ) {
			console.warn( 'No state in slot ' + i );
			return;
		}

		let json = JSON.parse( store['state_' + i] );

		this.loadLevelFromJSON( json, { forceEraseHistory: true } );

		console.log( 'Loaded state from slot ' + i );
	}
	gameCommands.push( c );
}