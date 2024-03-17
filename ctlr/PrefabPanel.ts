import * as tp from '../lib/toastpoint.js'

import { constructors, nameMap } from '../lib/juego/constructors.js'
import { create, clear } from '../lib/juego/domutil.js'
import { Entity } from '../lib/juego/Entity.js'
import { createCommandButton } from '../lib/juego/Menu.js'

import * as Debug from '../Debug.js'
import { GameControllerDom } from '../GameControllerDom.js'
import { store } from '../store.js'

import { Panel } from './Panel.js'

export class PrefabPanel extends Panel {
	/* property overrides */

	updateOn = ['localStorage'];

	constructor() {
		super( 'Prefabs' );
	}

	protected updateDom( c: GameControllerDom ) {
		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		let prefabKeys = Object.keys( store ).filter( x => x.indexOf( 'prefab-' ) == 0 );

		for ( let key of prefabKeys ) {
			let link = create( 'div', {}, body ) as HTMLDivElement;
			link.innerHTML = key;

			link.classList.add( 'object-link' );
			link.classList.add( 'nonempty' );
		
			link.onmousedown = () => {
				let json = JSON.parse( store[key] );
				let toaster = new tp.Toaster( constructors, nameMap );
				let prefab = tp.fromJSON( json, toaster ) as Entity;
				prefab.parent = null;

				c.runCommand( 'Place Entity', { target: prefab } );
			}
		}

		let saveButton = createCommandButton( 'Save', 'Save As Prefab' );
		body.appendChild( saveButton );

		if ( Debug.flags.LOG_PANEL_UPDATES ) {
			console.log( 'Updated panel prefabList' );
		}
	}
}