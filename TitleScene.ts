import { Entity } from './lib/juego/Entity.js'
import { Scene } from './Scene.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'
 
import { titleData } from './titleData.js'

import { renderFromEye, getDownsampled, whiteText } from './render.js'

export class TitleScene extends Scene {
	name: string = '';

	floaters: Array<Entity> = [];
	titleDrift: number = 0;
	origin = new Vec2( 0, 0 );

	constructor() {
		super( 'Title' );
	}

	update() {
		if ( Keyboard.keyHit( KeyCode.W ) ) this.messages.push( 'start' );

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
	}

	draw( context: CanvasRenderingContext2D ) {
		let rStep = 20 * this.camera.viewportW / 400;
		let slice = Math.PI * 2 / 180;

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
						   180, or, ir );
			return;
		}

		context.globalAlpha = 1.0;

		this.camera.moveContext( context );

			renderFromEye( context, 
						   shapes, 
						   this.origin,
						   new Vec2(),
						   180, or, ir );

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

		this.camera.unMoveContext( context );

		context.globalAlpha = 1.0;

		let y = this.camera.viewportH;

		whiteText( context, 'Use the [arrow keys] to move and [WASD] to shoot', 5, y - 60 );
		whiteText( context, 'Press [space] to pause', 5, y - 40 );
		whiteText( context, 'Press [W] to start', 5, y - 20 );

		whiteText( context, 'Graham Smith 2023', this.camera.viewportW - 5, y - 20, true );
	}
}