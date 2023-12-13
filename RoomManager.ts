import { Entity } from './lib/juego/Entity.js'
import { Shape } from './lib/juego/Shape.js'

import { Door } from './Door.js'

export class RoomManager {
	doors: Array<Door> = [];
	entities: Array<Entity> = [];

	playerIn: boolean = false;
	active: boolean = false;

	area: Shape;

	constructor( area: Shape ) {
		this.area = area;
	}

	freeze() {
		for ( let entity of this.entities ) {
			entity.frozen = true;
		}
	}

	activate() {
		for ( let door of this.doors ) {
			door.lock();
		}

		for ( let entity of this.entities ) {
			entity.frozen = false;
		}
	}

	deactivate() {
		for ( let door of this.doors ) {
			door.unlock();
		}
	}

	update( playerShape: Shape ) {
		let complete = true;  

		for ( let entity of this.entities ) {
			if ( !entity.removeThis ) complete = false;
		}

		if ( playerShape.getEdgeContact( this.area ) !== null ) {
			if ( !this.playerIn ) {
				let breakpoint = 0;
			}

			this.playerIn = true;
		} else {
			this.playerIn = false;
		}

		if ( this.active && complete ) {
			this.active = false;

			this.deactivate();
	
		} else if ( !this.active && !complete && this.playerIn ) {
			this.active = true;

			this.activate();
		}
	}
}