import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Dict } from './lib/juego/util.js'

import * as tp from './lib/toastpoint.js'

import { GameControllerDom } from './GameControllerDom.js'
import { Level } from './Level.js'
import { constructors, nameMap } from './objDef.js'
import { store } from './store.js'

export let gameCommands: Array<CommandRef> = [];

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
		let toaster = new tp.Toaster( constructors, nameMap );
		let scene = this.manager.currentScene;

		if ( scene instanceof Level ) {
			let flatLevel = tp.toJSON( scene, toaster );

			if ( toaster.errors.length > 0 ) {
				console.error( 'Failed to create state' );

				for ( let error of toaster.errors ) {
					console.error( error );
				}
			} else {
				store['state_' + i] = JSON.stringify( flatLevel );

				console.log( 'Saved state to slot ' + i );
			}

		} else {
			console.warn( 'Save State: Unhandled Scene type ' + 
				scene.constructor.name );
		}

		toaster.cleanAddrIndex();
	}
	gameCommands.push( c );


	// Load State
	c = new CommandRef( 'Load State ' + i, null, null, codeByDigit[i] );
	c.enter = function( this: GameControllerDom ) {
		let toaster = new tp.Toaster( constructors, nameMap );

		if ( !store['state_' + i] ) {
			console.warn( 'No state in slot ' + i );
			return;
		}

		let json = JSON.parse( store['state_' + i] );

		let level = tp.fromJSON( json, toaster );
		tp.resolveList( [level], toaster );
		
		for ( let error of toaster.errors ) {
			console.error( error );
		}

		for ( let entity of level['__entities'] ) {
			entity.init();
			level.em.insert( entity );
		}

		delete level['__entities'];

		if ( this.manager.currentScene !== null ) {
			this.manager.currentScene.sleep();
		}
		this.manager.currentScene = level as Level;

		console.log( 'Loaded state from slot ' + i );
	}
	gameCommands.push( c );
}