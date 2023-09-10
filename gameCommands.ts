import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'

import * as tp from './lib/toastpoint.js'

import { GameControllerDom } from './GameControllerDom.js'
import { Level } from './Level.js'
import { constructors, nameMap } from './objDef.js'
import { store } from './store.js'

export let gameCommands: Array<CommandRef> = [];


// Save State
let c = new CommandRef( 'Save State 1', null, null, KeyCode.DIGIT_1, MOD.CTRL );
c.enter = function( this: GameControllerDom ) {
	let toaster = new tp.Toaster( constructors, nameMap );
	let scene = this.manager.currentScene;

	if ( scene instanceof Level ) {
		let flatLevel = tp.toJSON( scene, toaster );

		store['state_1'] = JSON.stringify( flatLevel );

		console.log( 'Saved state to slot 1' );

	} else {
		console.warn( 'Save State: Unhandled Scene type ' + 
			scene.constructor.name );
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
		entity.init();
		level.em.insert( entity );
	}

	delete level['entities'];

	if ( this.manager.currentScene !== null ) {
		this.manager.currentScene.sleep();
	}
	this.manager.currentScene = level as Level;

	console.log( 'Loaded state from slot 1' );
}
gameCommands.push( c );