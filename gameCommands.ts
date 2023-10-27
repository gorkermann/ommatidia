import * as tp from './lib/toastpoint.js'

import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Entity } from './lib/juego/Entity.js'
import { IsoTriangleEntity, RightTriangleEntity,
		 OvalEntity } from './lib/juego/BasicEntity.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { constructors, nameMap } from './lib/juego/constructors.js'
import { Selectable } from './lib/juego/Selectable.js'
import { Shape } from './lib/juego/Shape.js'
import { Dict } from './lib/juego/util.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { DragMode } from './lib/juego/mode/DragMode.js'

import { COL } from './collisionGroup.js'
import { GameControllerDom } from './GameControllerDom.js'
import { Level } from './Level.js'
import { store } from './store.js'

import { PlayMode } from './mode/PlayMode.js'
import { PlaceMode } from './mode/PlaceMode.js'

export let gameCommands: Array<CommandRef> = [];

/*
									null origin mode means that the command can be run from any mode
									null key means that there is no keyboard shortcut to run the command

									name        origin mode 	target mode     key  
*/
gameCommands.push( new CommandRef( 'Play', 		null, 			PlayMode, 		KeyCode.ESC ) );
gameCommands.push( new CommandRef( 'Drag', 		PlayMode, 		DragMode, 		null ) );

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

type ArrayOfEntity = {
	targets: Array<Entity>;
}

type SingleEntity = {
	target: Entity;
}

type FilenameStruct = {
	filename: string;
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
 
// Save As Prefab
c = new CommandRef( 'Save As Prefab', null, null );
c.enter = function( this: GameControllerDom, options?: FilenameStruct ) {
	if ( this.sel.selection.length == 0 ) return;

	let select = this.sel.selection[0];

	let toaster = new tp.Toaster( constructors, nameMap );
	let json = tp.toJSON( select, toaster );
	toaster.cleanAddrIndex();

	if ( json ) {
		let root = select.getRoot();

		if ( !json['collisionGroup'] ) {
			json['collisionGroup'] = root.collisionGroup;
		}

		let str = JSON.stringify( json );
		let key = 'prefab-' + select.name;
		store[key] = str;

		console.log( 'Save As Prefab: Saved prefab ' + key );

	} else {
		console.error( 'Save As Prefab: Failed to save prefab' );
	}
}
gameCommands.push( c );

// Place Entity
c = new CommandRef( 'Place Entity', null, null );
c.enter = function( this: GameControllerDom, options?: SingleEntity ) {
	this.changeMode( new PlaceMode( 'Place Entity', options.target ) );
}
gameCommands.push( c );

// Hover Only
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

// Unhover All
c = new CommandRef( 'Unhover All', null, null );
c.enter = function( this: GameControllerDom, ) {
	this.sel.clearHovered();
}
gameCommands.push( c );

// Select Only
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

// Union
c = new CommandRef( 'Union', null, null );
c.enter = function( this: GameControllerDom, options?: SingleEntity ) {
	if ( this.sel.selection.length < 2 ) {
		console.warn( 'Union: Not enough entities selected' );
		return;
	}

	if ( this.sel.selection.length > 2 ) {
		console.warn( 'Union: Too many entities selected' );
		return;
	}

	let shapes = Shape.union( this.sel.selection[0].getShapes(), this.sel.selection[1].getShapes() );

	this.sel.selection[0].replacePresetShapes( shapes );
}
gameCommands.push( c );

// Intersection
c = new CommandRef( 'Intersection', null, null );
c.enter = function( this: GameControllerDom, options?: SingleEntity ) {
	if ( this.sel.selection.length < 2 ) {
		console.warn( 'Union: Not enough entities selected' );
		return;
	}

	if ( this.sel.selection.length > 2 ) {
		console.warn( 'Union: Too many entities selected' );
		return;
	}

	let shapes = Shape.intersection( this.sel.selection[0].getShapes(), this.sel.selection[1].getShapes() );

	this.sel.selection[0].replacePresetShapes( shapes );
}
gameCommands.push( c );

// Difference
c = new CommandRef( 'Difference', null, null );
c.enter = function( this: GameControllerDom, options?: SingleEntity ) {
	if ( this.sel.selection.length < 2 ) {
		console.warn( 'Union: Not enough entities selected' );
		return;
	}

	if ( this.sel.selection.length > 2 ) {
		console.warn( 'Union: Too many entities selected' );
		return;
	}

	let shapes = Shape.difference( this.sel.selection[0].getShapes(), this.sel.selection[1].getShapes() );

	this.sel.selection[0].replacePresetShapes( shapes );
}
gameCommands.push( c );

// Place Rect Entity
c = new CommandRef( 'Place Rect Entity', null, null );
c.enter = function( this: GameControllerDom ) {
	let e = new Entity( new Vec2(), 20, 20 );
	e.collisionGroup = COL.LEVEL;
	this.changeMode( new PlaceMode( 'Place Rect Entity', e ) );
}
gameCommands.push( c );

// Place Isoceles Triangle Entity
c = new CommandRef( 'Place Isoceles Triangle Entity', null, null );
c.enter = function( this: GameControllerDom ) {
	let e = new IsoTriangleEntity( new Vec2(), 20, 20 );
	e.collisionGroup = COL.LEVEL;
	this.changeMode( new PlaceMode( 'Place Isoceles Triangle Entity', e ) );
}
gameCommands.push( c );

// Place Right Triangle Entity
c = new CommandRef( 'Place Right Triangle Entity', null, null );
c.enter = function( this: GameControllerDom ) {
	let e = new RightTriangleEntity( new Vec2(), 20, 20 );
	e.collisionGroup = COL.LEVEL;
	this.changeMode( new PlaceMode( 'Place Right Triangle Entity', e ) );
}
gameCommands.push( c );

// Place Oval Entity
c = new CommandRef( 'Place Oval Entity', null, null );
c.enter = function( this: GameControllerDom ) {
	let e = new OvalEntity( new Vec2(), 20 );
	e.collisionGroup = COL.LEVEL;
	this.changeMode( new PlaceMode( 'Place Oval Entity', e ) );
}
gameCommands.push( c );