import { Entity } from '../lib/juego/Entity.js'
import { Keyboard, KeyCode } from '../lib/juego/keyboard.js'
import { GenericMode } from '../lib/juego/mode/Mode.js'
import { Vec2 } from '../lib/juego/Vec2.js'

import { REWIND_SECS } from '../collisionGroup.js'
import * as Debug from '../Debug.js'
import { GameControllerDom } from '../GameControllerDom.js'
import { Level } from '../Level.js'

let actions = ['down', 'up', 'drag'];
type MouseAction = typeof actions[number];

export class PlaceMode extends GenericMode {
	placedEntities: Array<Entity> = [];

	protoent: Entity;

	constructor( command: string, entity: Entity ) {
		super( command );

		this.save = false;

		this.protoent = entity;
	}

	begin( gc: GameControllerDom ) {
		super.begin( gc );

		this.mousemove( gc );
	}

	mousemove( gc: GameControllerDom ) {
		this.protoent.pos.set( gc.cursor );
	}

	mousedown( gc: GameControllerDom ) {
		this.placeAndExit( gc );
	}

	placeAndExit( gc: GameControllerDom ) {
		gc.currentScene.em.insert( this.protoent );

		this.placedEntities.push( this.protoent );
		this.protoent = null;
		this.complete = true;

		gc.exitMode();		
	}

	cancel( gc: GameControllerDom ) {
		this.protoent.destructor();

	}

	ok( gc: GameControllerDom ) {
		if ( this.placedEntities.length > 0 ) {
			this.save = true;
		}
	}

	draw( gc: GameControllerDom, context: CanvasRenderingContext2D ) {
		this.protoent.draw( context );
	}
}