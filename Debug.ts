import { Dict } from './lib/juego/util.js'

import { store } from './store.js'

export let flags: { [key: string]: boolean } = {
	DRAW_NORMAL: false,
}

export function toggleFlag( flagName: string ) {
	if ( flagName in flags ) {
		if ( flags[flagName] ) {
			flags[flagName] = false;
		} else {
			flags[flagName] = true;
		}

		if ( typeof document !== 'undefined' ) {
			document.dispatchEvent( 
				new CustomEvent( 'var_' + flagName, { detail: flags[flagName] } ) );
		}

	} else {
		throw new Error( 'Debug.toggleFlag: No flag named ' + flagName );
	}
}

export function setFlags( newFlags: Dict<boolean> ) {
	for ( let flagName in newFlags ) {
		if ( flagName in flags ) {
			flags[flagName] = newFlags[flagName];

			if ( typeof document !== 'undefined' ) {
				document.dispatchEvent( 
					new CustomEvent( 'var_' + flagName, { detail: flags[flagName] } ) );
			}
		}
	}
}

export function createDOMPanel(): HTMLDivElement {
	let panel = document.createElement( 'div' );
	panel.classList.add( 'query-panel' );

	for ( let option in flags ) {
		let optionName = option; // bring name into local scope

		let div = document.createElement( 'div' );
		div.innerHTML = optionName;

		let checkbox = document.createElement( 'input' ) as HTMLInputElement;
		checkbox.className = 'check';
		checkbox.type = 'checkbox';
		checkbox.checked = flags[optionName];

		checkbox.onchange = () => {
			flags[optionName] = checkbox.checked;
			document.dispatchEvent( new CustomEvent( 'var_' + optionName, { detail: flags[optionName] } ) );
		}

		document.addEventListener( 'var_' + optionName, ( e: Event ) => {
			if ( ( e as CustomEvent).detail ) {
				checkbox.checked = true;
			} else {
				checkbox.checked = false;
			}
		} );

		div.appendChild( checkbox );
		panel.appendChild( div );
	}

	return panel;
}

export function init() {

	// get flag data
	let debugConfig: { [ key: string ]: boolean } = {};
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
}