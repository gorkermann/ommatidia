import { Camera } from './lib/juego/Camera.js'
import { Entity } from './lib/juego/Entity.js'
import { EntityManager } from './lib/juego/EntityManager.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Shape } from './lib/juego/Shape.js'
import { Sound } from './lib/juego/Sound.js'

import * as tp from './lib/toastpoint.js'

///////////
// SCENE //
///////////

/*
	Parent class for cutscenes and levels
*/

export type SceneDrawOptions = {
	noConsole?: boolean;
}

export class OmmatidiaScene {
	name: string = '';
	isLoaded: boolean = false;
	camera: Camera = new Camera();
	em: EntityManager = new EntityManager();

	sounds: Array<Sound> = [];

	final: boolean = false;
	messages: Array<string> = [];

	discardFields: Array<string> = [];
	//saveFields = [];

	constructor( name: string ) {
		this.name = name;
	}

	protected toToast( toaster: tp.Toaster ): any {
		let fields = Object.keys( this );

		// never save these fields (which are lists of other fields)
		let exclude = ['editFields', 'saveFields', 'discardFields']

		// fields for for serialization only (exclude the old value if left in by mistake)
		exclude = exclude.concat( ['entities', '__entities'] );

		exclude = exclude.concat( this.discardFields );
		fields = fields.filter( x => !exclude.includes( x ) );

		let flat: any = {};

		tp.setMultiJSON( flat, fields, this, toaster );
		tp.setJSON( flat, '__entities', this.em.entities, toaster );

		return flat;
	}

	load(): Promise<any> {
		// dummy load function

		return new Promise<void>( ( resolve, reject ) => {
			this.isLoaded = true;

			resolve();
		});
	}

	wake(): void {}

	sleep(): void {}

	reset() {}

	getShapes(): Array<Shape> {
		let shapes = [];

		for ( let entity of this.em.entities ) {
			for ( let shape of entity.getShapes( 0.0 ) ) {
				shapes.push( shape );
			}
		}

		return shapes;
	}

	update() {}

	updateSounds() {
		for ( let sound of this.sounds ) {
			this.updateSound( sound );
		}
	}

	updateSound( source: Sound ) {
		let dist = 0;

		if ( source.pos ) {
		//	dist = this.player.pos.distTo( source.pos );
		}

		let vol = source.distScale / ( dist ** 2 + 1 );
		source.audio.volume = Math.min( vol, 1.0 );

		let atStart = source.audio.currentTime == 0 || source.audio.ended;

		if ( atStart && source.count > 0 ) {
			source.audio.play();

			if ( !source.audio.loop ) source.count -= 1;
		}
	}

	describe( entity: Entity, dir?: Vec2 ) {}

	drawPauseOverlay( context: CanvasRenderingContext2D ) {
		if ( typeof document === 'undefined' ) return;

		context.fillStyle = 'hsl( 0, 0%, 90%)';
		context.font = '24px Arial';

		let text = 'P A U S E';
		let meas = context.measureText( text );
		let w = meas.width;
		let h = meas.actualBoundingBoxAscent + meas.actualBoundingBoxDescent;
		
		context.fillText( text, this.camera.viewportW / 2 - w / 2, this.camera.viewportH / 2 - 100 + h / 2 );
	}

	draw( context: CanvasRenderingContext2D, drawOptions: SceneDrawOptions={} ) {}
}