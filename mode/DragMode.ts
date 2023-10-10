import { Keyboard, KeyCode } from '../lib/juego/keyboard.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { GenericMode } from '../lib/juego/Mode.js'

import { GameControllerDom } from '../GameControllerDom.js'
//import { placeOnGrid } from '../util.js'

export class DragMode extends GenericMode {
	oldPos: Vec2 = null;
	prevTopIndex: number = -1; 
	downmark: Vec2;

	cameraPos: Vec2;

	cameraDrag: boolean = false;

	//relation: PosRelation = xxx;

	constructor( command: string ) {
		super( command );

		this.save = false;
	}

	begin( gc: GameControllerDom ) {
		this.downmark = gc.cursor.copy();
		this.cameraPos = gc.camera.pos.copy();

		let doDrag = false;

		for ( let prim of gc.sel.hoverlist.list ) {
			if ( gc.sel.selection.includes( prim ) ) {
				doDrag = true;
			}
		}

		if ( doDrag ) {
			let drag = gc.sel.selection[0];  

			for ( let prim of gc.sel.selection ) {
				prim.startDrag();
			}

		} else {
			this.cameraDrag = true;
		}
	}

	mousemove( gc: GameControllerDom ) {
		if ( this.downmark ) {
			let defaultOffset = gc.cursor.minus( this.downmark );

			if ( Keyboard.keyHeld( KeyCode.CTRL ) ) {
				if ( Math.abs( defaultOffset.x ) > Math.abs( defaultOffset.y ) ) {
					defaultOffset.y = 0;
				} else {
					defaultOffset.x = 0;
				}
			}

			if ( this.cameraDrag ) {
				let offset = gc.mouse.pos
							 .minus( gc.mouse.downmark )
							 .scale( -1 / gc.camera.scale );

				gc.camera.pos.set( this.cameraPos.plus( offset ) );
                
			} else {
				this.save = true;

				for ( let select of gc.sel.selection ) {

					// drag
					select.drag( defaultOffset );
				}
          	}
		}
	}

	mousedown( gc: GameControllerDom ) {
		if ( this.downmark === null ) {
			this.downmark = new Vec2();
		}
		this.downmark.set( gc.cursor );

		if ( this.oldPos === null ) {
			this.oldPos = new Vec2(0, 0);
		}
		this.oldPos.set( this.downmark );
	}

	mouseup( gc: GameControllerDom ) {
		// accept drag positions
		for ( let prim of gc.sel.selection ) {
			prim.endDrag( true );
		}

		this.complete = true;	
		gc.exitMode();
	}
}