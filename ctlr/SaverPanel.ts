import * as tp from '../lib/toastpoint.js'

import { constructors, nameMap } from '../lib/juego/constructors.js'
import { create, clear } from '../lib/juego/domutil.js'
import { createCommandButton } from '../lib/juego/Menu.js'

import * as Debug from '../Debug.js'
import { GameControllerDom } from '../GameControllerDom.js'
import { store } from '../store.js'

import { Panel } from './Panel.js'

export class SaverPanel extends Panel {
	/* property overrides */

	updateOn = ['localStorage'];

	constructor() {
		super( 'File Manager');
	}

	protected updateDom( c: GameControllerDom ) {
		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		for ( let key of Object.keys( store ) ) {
			let link = create( 'div', {}, body ) as HTMLDivElement;
			link.innerHTML = key;

			link.classList.add( 'file-link' );
		
			link.onmousedown = () => {
				c.runCommand( 'Load File', { filename: key } );
			}
		}

		let saveAsName = create( 'input', {}, body ) as HTMLInputElement;
		let button = createCommandButton( 'Save', 'Save File', [], () => { return { filename: saveAsName.value } } );
		body.appendChild( button );

		if ( Debug.flags.LOG_PANEL_UPDATES ) {
			console.log( 'Updated panel fileList' );
		}
	}
}