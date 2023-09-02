import { Scene } from "./lib/juego/Scene.js"
import { Entity } from "./lib/juego/Entity.js"
import { Keyboard, KeyCode } from "./lib/juego/keyboard.js"
import { Text } from "./lib/juego/Menu.js"
import { Shape } from './lib/juego/Shape.js'
import { Vec2 } from './lib/juego/Vec2.js'
 
import { titleData } from './titleData.js'

import { renderFromEye, getDownsampled, whiteText } from './render.js'

export class TitleScene extends Scene {
	name: string = "";

	floaters: Array<Entity> = [];
	titleDrift: number = 0;
	//startTime: number = 0;
	canvas: HTMLCanvasElement = null;
	//hue: number = Math.random() * 360;

	boundKeyHandler = this.keyHandler.bind(this);

	constructor() {
		super( "Title" );
	}

	wake() {
		document.addEventListener( "keydown", this.boundKeyHandler );
	}

	sleep() {
		document.removeEventListener( "keydown", this.boundKeyHandler );
	}

	keyHandler( e: any) {
		console.log( this.name );

		if ( e.keyCode == KeyCode.Z ) {
			document.dispatchEvent( new CustomEvent( "start" ) );
		}

		if ( e.keyCode == KeyCode.X ) {
			document.dispatchEvent( new CustomEvent( "startBoss" ) );
		}
	}

	update() {

	}

	draw( context: CanvasRenderingContext2D ) {
		let rStep = 20;
		let slice = Math.PI * 2 / 180;

		context.globalAlpha = 1.0;

		context.save();
		context.translate( 200, 200 );

			let slices = [];
			slices[179] = 0;
			slices.fill( Math.PI * 2 / 180 );

			let shapes = [];
			for ( let floater of this.floaters ) {
				let shape = Shape.makeRectangle( floater.pos,
												 floater.width,
												 floater.height );
				shape.material = floater.material;

				shapes.push( shape );
			}

			renderFromEye( context, shapes, new Vec2( 200, 200 ), slices, 180, 120 );

			context.globalAlpha = 1.0;
			context.fillStyle = 'black';
			let angle = Math.PI * 2 * (5/8) + this.titleDrift;

			this.titleDrift -= 0.0002;

			for ( let i = 0; i < titleData[0].length; i++ ) {
				angle += slice / 2;

				let or = 190;
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

		context.restore();

		context.globalAlpha = 1.0;

		whiteText( context, "Use the arrow keys to move and jump. Press Z to start", 5, 380 );
		whiteText( context, "Graham Smith 2023", 300, 380 );
	}
}