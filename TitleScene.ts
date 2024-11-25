import { Entity } from './lib/juego/Entity.js'
import { OmmatidiaScene } from './Scene.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'

import * as Debug from './Debug.js'
import { titleData } from './titleData.js'
import { FloaterScene } from './FloaterScene.js'

import { renderFromEye, whiteText } from './render.js'

import { sendLcdString } from './lcd.js'

export class TitleScene extends OmmatidiaScene {
	name: string = '';

	floaterScene: FloaterScene;
	floaters: Array<Entity> = [];
	titleDrift: number = 0;
	origin = new Vec2( 0, 0 );

	constructor() {
		super( 'Title' );

		this.floaterScene = new FloaterScene();
		this.floaterScene.camera.setViewport( 400, 400 );

		this.floaters = this.floaterScene.floaters;
	}

	load(): Promise<void> {
		sendLcdString( 'Press A to start' );

		return Promise.resolve();
	}

	update() {
		this.em.updateShapeCache();

		if ( Keyboard.keyHit( KeyCode.Z ) ) this.messages.push( 'start_game' );

		if ( Keyboard.keyHeld( KeyCode.LEFT ) ) {
			this.origin.add( new Vec2( -5, 0 ) );
		}

		if ( Keyboard.keyHeld( KeyCode.RIGHT ) ) {
			this.origin.add( new Vec2( 5, 0 ) );
		}
		
		// up/down
		if ( Keyboard.keyHeld( KeyCode.UP ) ) {
			this.origin.add( new Vec2( 0, -5 ) );
		}

		if ( Keyboard.keyHeld( KeyCode.DOWN ) ) {
			this.origin.add( new Vec2( 0, 5 ) );
		}		

		this.floaterScene.update();
	}

	draw( context: CanvasRenderingContext2D ) {
		let sliceCount = parseInt( Debug.fields['SLICE_COUNT'].value );

		let ir = 120 * this.camera.viewportW / 400;
		let or = 180 * this.camera.viewportH / 400;

		let shapes = [];
		for ( let floater of this.floaters ) {
			let shape = Shape.makeRectangle( floater.pos,
											 floater.width,
											 floater.height );
			shape.material = floater.material;

			shapes.push( shape );
		}

		if ( typeof document === 'undefined' ) {
			renderFromEye( context, 
						   shapes, 
						   this.origin,
						   new Vec2(),
						   sliceCount,
						   or, ir );
		} else {
			context.globalAlpha = 1.0;

			this.camera.moveContext( context );

				renderFromEye( context, 
							   shapes, 
							   this.origin,
							   new Vec2(),
							   sliceCount,
							   or, ir );

				this.drawTitle( context, sliceCount );

			this.camera.unMoveContext( context );

			context.globalAlpha = 1.0;

			let y = this.camera.viewportH;

			whiteText( context, 'CONTROLS', 5, y - 180 );
			whiteText( context, '[left]: move left', 5, y - 160 );
			whiteText( context, '[right]: move right', 5, y - 140 );
			whiteText( context, '[Z]: jump', 5, y - 120 );
			whiteText( context, '[X]: use transponder', 5, y - 100 );
			whiteText( context, '[space]: pause', 5, y - 80 );
			whiteText( context, '[R] (hold): restart level', 5, y - 60 );

			whiteText( context, 'Press [Z] to start', 5, y - 20 );

			whiteText( context, 'Graham Smith 2023', this.camera.viewportW - 5, y - 20, true );
		}
	}

	drawTitle( context: CanvasRenderingContext2D, sliceCount: number ) {
		let slice = Math.PI * 2 / 180; // not sliceCount
		let rStep = 20 * this.camera.viewportW / 400;

		context.globalAlpha = 1.0;
		context.fillStyle = 'white';
		let angle = Math.PI * 2 * (9/16) + this.titleDrift;

		this.titleDrift -= 0.0000;

		for ( let i = 0; i < titleData[0].length; i++ ) {
			angle += slice / 2;

			let or = 190 * this.camera.viewportW / 400;
			let ir;

			for ( let j = 0; j < titleData.length; j++ ) {
				ir = or - rStep;

				if ( titleData[j][i] ) {
					context.beginPath();
					context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
					context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
					context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
					context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
					context.fill();
				}
			
				or = ir;
			}

			angle += slice / 2;
		}
	}
}