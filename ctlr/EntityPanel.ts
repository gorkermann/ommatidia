import * as tp from '../lib/toastpoint.js'

import { constructors, nameMap } from '../lib/juego/constructors.js'
import { create, clear } from '../lib/juego/domutil.js'
import { createCommandButton } from '../lib/juego/Menu.js'

import * as Debug from '../Debug.js'
import { GameControllerDom } from '../GameControllerDom.js'
import { store } from '../store.js'

import { Panel } from './Panel.js'

export class EntityPanel extends Panel {
	constructor() {
		super( 'Basic Entities');
	}

	protected updateDom( c: GameControllerDom ) {
		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		let button = createCommandButton( 'Rect', 'Place Rect Entity' );
		body.appendChild( button );

		button = createCommandButton( 'Iso Triangle', 'Place Isoceles Triangle Entity' );
		body.appendChild( button );

		button = createCommandButton( 'Right Triangle', 'Place Right Triangle Entity' );
		body.appendChild( button );

		button = createCommandButton( 'Oval', 'Place Oval Entity' );
		body.appendChild( button );
	}
}