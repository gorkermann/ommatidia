import { create } from './lib/juego/domutil.js'
import { store } from './store.js'
import { createCommandButton } from './lib/juego/Menu.js'

import * as Debug from './Debug.js'
import { GameControllerDom } from './GameControllerDom.js'

export class Panel {
	updateOn: Array<string> = [];
	lastUpdateTime: number = 0;

	constructor() {}

	update( c: GameControllerDom ) {}
}

export class SaverPanel extends Panel {
	/* property overrides */

	updateOn = ['localStorage'];

	constructor() {
		super();
	}

	update( c: GameControllerDom ) {
		let panel = create( 'div' ) as HTMLDivElement;

		for ( let key of Object.keys( store ) ) {
			let link = create( 'div', {}, panel ) as HTMLDivElement;
			link.innerHTML = key;

			link.classList.add( 'file-link' );
		
			link.onmouseup = () => {
				c.runCommand( 'Load File', { filename: key } );
			}
		}

		let saveAsName = create( 'input', {}, panel ) as HTMLInputElement;
		let button = createCommandButton( 'Save', 'Save File', [], () => { return { filename: saveAsName.value } } );
		panel.appendChild( button );

		let div = document.getElementById( 'fileList' );

		while ( div.firstChild ) {
			div.removeChild( div.firstChild );
		}

		div.appendChild( panel );

		if ( Debug.flags.LOG_PANEL_UPDATES ) {
			console.log( 'Updated panel fileList' );
		}
		this.lastUpdateTime = new Date().getTime();
	}
}
