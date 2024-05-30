import { GenericMode } from '../lib/juego/mode/Mode.js'

import { GameController } from '../GameController.js'

export class BareMode extends GenericMode {
	constructor() {
		super( 'Bare' );
	}

	update( gc: GameController ) {
		gc.currentScene.update();
	}
}