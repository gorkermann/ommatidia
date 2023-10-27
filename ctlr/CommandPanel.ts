import * as tp from '../lib/toastpoint.js'

import { constructors, nameMap } from '../lib/juego/constructors.js'
import { create, clear } from '../lib/juego/domutil.js'
import { createCommandButton } from '../lib/juego/Menu.js'

import * as Debug from '../Debug.js'
import { GameControllerDom } from '../GameControllerDom.js'
import { store } from '../store.js'

import { Panel } from './Panel.js'

export class CommandPanel extends Panel {
	constructor() {
		super( 'Commands');
	}

	protected updateDom( c: GameControllerDom ) {
		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		let button = createCommandButton( 'Union', 'Union' );
		body.appendChild( button );

		button = createCommandButton( 'Intersection', 'Intersection' );
		body.appendChild( button );

		button = createCommandButton( 'Difference', 'Difference' );
		body.appendChild( button );
	}
}