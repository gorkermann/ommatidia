import { Dict } from './lib/juego/util.js'
import { Debug as juegoDebug } from './lib/juego/Debug.js'

import { store } from './store.js'

export let flags: Dict<boolean> = {
	DEBUG_MODE: false,
	DRAW_NORMAL: false,
	DRAW_FROM_EYE: true,
	DRAW_SPHERICAL: false,
	DRAW_RAYS: false,
	LOG_ANIM: false,
	SUPER_SHOT: false,
	FORCE_BOSS_ATK: false,
	HIGHLIGHT_CORNERS: true,
	HIGHLIGHT_INTERIOR_CORNERS: false,
	AUTO_BRIGHT_ADJUST: true,
	LEVEL_ALT_MAT: true,
	LOG_PANEL_UPDATES: true,
	LOG_STATE_SAVELOAD: false, 
	MOUSE_SELECT: false,
	SHOW_DEATH: false,
}

export type DebugField = {
	value: string;
	default?: string;
	isValid?: boolean;
}

export function arrayOfStrings( list: Array<string> ): ( x: DebugField ) => boolean {
	return function( x: DebugField ) {
		let entries = x.value.split( ',' );
		for ( let entry of entries ) {
			if ( !list.includes( entry ) ) {
				return false;
			}
		}

		return true;
	}
}

export let validators: Dict<( x: DebugField ) => boolean> = {};

export let fields: Dict<DebugField> = {
	ROLL_ATK: { value: '', default: 'default' },
	LOCK_ATK: { value: '', default: 'default' },
	SHELL_ATK: { value: '', default: 'default' },
}

for ( let flagName in juegoDebug ) {
	flags[flagName] = juegoDebug[flagName];
}

export function toggleFlag( flagName: string ) {
	if ( flagName in flags ) {
		let obj: Dict<boolean> = {};

		if ( flags[flagName] ) {
			obj[flagName] = false;
		} else {
			obj[flagName] = true;
		}

		setFlags( obj );
	} else {
		throw new Error( 'Debug.toggleFlag: No flag named ' + flagName );
	}
}

export function setFlags( newFlags: Dict<boolean | DebugField> ) {
	for ( let flagName in newFlags ) {
		let value;

		if ( flagName in flags ) {
			value = newFlags[flagName];

			if ( typeof value == 'boolean' ) {
				flags[flagName] = value;

				if ( flagName in juegoDebug ) {
					juegoDebug[flagName] = flags[flagName];
				}
			}

			if ( typeof document !== 'undefined' ) {
				document.dispatchEvent( 
					new CustomEvent( 'var_' + flagName, { detail: flags[flagName] } ) );
			}

		} else if ( flagName in fields ) {
			value = ( newFlags[flagName] as DebugField ).value;

			if ( typeof value == 'string' ) {
				value = value.trim();

				if ( value.length > 0 ) {
					fields[flagName].value = value;
				} else {
					fields[flagName].value = fields[flagName].default;
				}

				if ( flagName in validators ) {
					fields[flagName].isValid = validators[flagName]( fields[flagName] );
				}

				if ( typeof document !== 'undefined' ) {
					document.dispatchEvent( 
						new CustomEvent( 'var_' + flagName, { detail: fields[flagName] } ) );
				}
			}
		}
	}
}

export function init() {

	// get flag data
	let debugConfig: Dict<boolean | DebugField> = {};
	try {
		debugConfig = JSON.parse( store['config'] );
	} catch {
		store['config'] = JSON.stringify( {} );
	}
	
	setFlags( debugConfig );

	// set listeners to save debug values
	for ( let flagName in flags ) {
		document.addEventListener( 'var_' + flagName, ( e: Event ) => {
			let config = JSON.parse( store['config'] );
			config[flagName] = ( e as CustomEvent ).detail;

			store['config'] = JSON.stringify( config );
		} );
	}

	for ( let flagName in fields ) {
		document.addEventListener( 'var_' + flagName, ( e: Event ) => {
			let config = JSON.parse( store['config'] );
			config[flagName] = ( e as CustomEvent ).detail;

			store['config'] = JSON.stringify( config );
		} );
	}
}