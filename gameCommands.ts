
import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Entity } from './lib/juego/Entity.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Selectable } from './lib/juego/Selectable.js'
import { Dict } from './lib/juego/util.js'

import { DragMode } from './lib/juego/mode/DragMode.js'

import * as tp from './lib/toastpoint.js'

import { GameControllerDom } from './GameControllerDom.js'
import { Level } from './Level.js'
import { constructors, nameMap } from './objDef.js'
import { store } from './store.js'

import { PlayMode } from './mode/PlayMode.js'

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

let c: CommandRef;

// Quick Access States
for ( let i in codeByDigit ) {

	// Save State
	c = new CommandRef( 'Save State ' + i, null, null, codeByDigit[i], MOD.CTRL );
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
			console.error( 'No state in slot ' + i );
			return;
		}

		let json = JSON.parse( store['state_' + i] );

		this.loadLevelFromJSON( json, { forceEraseHistory: true } );

		console.log( 'Loaded state from slot ' + i );
	}
	gameCommands.push( c );
}

// Load File
c = new CommandRef( 'Load File', null, null );
c.enter = function( this: GameControllerDom, options?: FilenameStruct ) {
	if ( !options || !options.filename ) {
		console.error( 'Load File: invalid options: ' + options );
		return;
	}

	if ( !store[options.filename] ) {
		console.error( 'Load File: No file named ' + options.filename );
		return;
	}

	let json = JSON.parse( store[options.filename] );

	this.loadLevelFromJSON( json, { forceEraseHistory: true } );

	console.log( 'Load File: Loaded file ' + options.filename );
}
gameCommands.push( c );	

// Save File
c = new CommandRef( 'Save File', null, null );
c.enter = function( this: GameControllerDom, options?: FilenameStruct ) {
	if ( !options || !options.filename ) {
		console.error( 'Save File: invalid options: ' + options );
		return;
	}

	if ( store[options.filename] ) {
		console.warn( 'Save File: overwriting ' + options.filename );
	}

	let json = this.getJSON();

	if ( json ) {
		let str = JSON.stringify( json );
		store[options.filename] = str;

		console.log( 'Save File: Saved file ' + options.filename );

	} else {
		console.error( 'Save File: Failed to create state' );
	}
}
gameCommands.push( c );	
 
type ArrayOfEntity = {
	targets: Array<Entity>;
}

type SingleEntity = {
	target: Entity;
}

type FilenameStruct = {
	filename: string;
}

c = new CommandRef( 'Hover Only', null, null );
c.enter = function( this: GameControllerDom, options?: SingleEntity ) {
	if ( !options || !options.target ) {
		console.error( 'Hover Only: invalid options: ' + options );
		return;
	}

	this.sel.clearHovered();

	this.sel.hoverlist.add( [options.target] );
}
gameCommands.push( c );

c = new CommandRef( 'Unhover All', null, null );
c.enter = function( this: GameControllerDom, ) {
	this.sel.clearHovered();
}
gameCommands.push( c );

c = new CommandRef( 'Select Only', null, null );
c.enter = function( this: GameControllerDom, options?: SingleEntity ) {
	if ( !options || !options.target ) {
		console.error( 'Hover Only: invalid options: ' + options );
		return;
	}

	this.sel.doSelect( {}, options.target );

	this.inspect( this.sel.selection );
}
gameCommands.push( c );