import { Vec2 } from '../lib/juego/Vec2.js'
import { Keyboard, KeyCode } from '../lib/juego/keyboard.js'
import { GenericMode } from '../lib/juego/mode/Mode.js'

import { GameControllerDom } from '../GameControllerDom.js'

//import { EditMode } from './EditMode.js'

import { REWIND_SECS } from '../collisionGroup.js'
import * as Debug from '../Debug.js'
import { Level } from '../Level.js'

let actions = ['down', 'up', 'drag'];
type MouseAction = typeof actions[number];

export class PlayMode extends GenericMode {
	//saveStateInterval: number = 1000;
	//lastStateTime: number = 0; // milliseconds of play time since scene started

	private dragged: boolean = false;
	oldPos: Vec2 = new Vec2();

	sticky: boolean = false;
	all: boolean = false;
	allHovered: boolean = false;

	constructor() {
		super( 'Play' );
	}

	begin( gc: GameControllerDom ) {
		this.oldPos.set( gc.cursor );
	}

	mousemove( gc: GameControllerDom ) {
		gc.updateHovered();

		if ( gc.mouse.isHeld() ) {

			// look for prims at OLD position
			gc.sel.updateHovered( this.oldPos );

			// if hovered prim is NOT in selection, select it only
			if ( gc.sel.anyHovered() ) {
				if ( !gc.sel.selection.includes( gc.sel.hoverlist.getTarget() ) ) {
					this.select( gc, 'drag' );
				}
			}

			this.dragged = true;

			gc.changeMode( 'Drag' );
		}

		this.oldPos.set( gc.cursor );
	}

	mousedown( gc: GameControllerDom ) {
		this.dragged = false;
	}

	mouseup( gc: GameControllerDom ) {
		if ( !this.dragged ) {
			this.select( gc, 'up' );
		}
	}

	select( gc: GameControllerDom, action: MouseAction ) {
		let target = gc.sel.hoverlist.getTarget();

		if ( this.allHovered ) {
			gc.sel.unselectAll();

			for ( let prim of gc.sel.hoverlist.list ) {
				gc.sel.add( prim );
			}

		// select next hovered item
		} else {
			gc.sel.doSelect( { sticky: this.sticky, all: this.all } );

			gc.inspect( gc.sel.selection );
		}
	}

	keyboard( gc: GameControllerDom ) {
		super.keyboard( gc );

		//gc.currentCommand = 'Select';

		this.sticky = false;
		if ( Keyboard.keyHeld( KeyCode.CTRL ) ) {
			this.sticky = true;
			//gc.currentCommand = 'Select (Sticky)';
		}

		this.all = false;
		if ( Keyboard.keyHeld( KeyCode.ALT ) ) {
			this.all = true;
			//gc.currentCommand = 'Select (All of Type)';
		}

		this.allHovered = false;
		if ( Keyboard.keyHeld( KeyCode.SHIFT ) ) {
			this.allHovered = true;
			//gc.currentCommand = 'Select (Hovered)';
		}
	}

	update( gc: GameControllerDom ) {
		gc.currentScene.update();

		// save recent game states
		if ( gc.currentScene instanceof Level ) {
			if ( gc.currentScene.elapsedTotal - gc.lastStateTime > gc.saveStateInterval ) {
				let json = gc.getJSON();

				if ( json ) {
					gc.recentStates.push( json );

					if ( Debug.flags.LOG_STATE_SAVELOAD ) console.log( 'pushed state at ' + gc.currentScene.elapsedTotal );
				}

				// keep only the most recent states
				if ( gc.recentStates.length > REWIND_SECS ) {
					gc.recentStates = gc.recentStates.slice( -REWIND_SECS );
				}

				gc.lastStateTime = ( gc.currentScene as Level ).elapsedTotal;
			}

			//gc.camera.pos.set( gc.currentScene.player.pos );
		}

		gc.floaterScene.update();
	}
}