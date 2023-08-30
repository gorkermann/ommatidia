import { Scene } from "./lib/juego/Scene.js"
import { Entity } from "./lib/juego/Entity.js"
import { Keyboard, KeyCode } from "./lib/juego/keyboard.js"
import { Text } from "./lib/juego/Menu.js"
import { Color } from "./lib/juego/Colors.js"

export class TitleScene extends Scene {
	name: string = "";

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
	}

	draw( context: CanvasRenderingContext2D ) {
		context.fillStyle = 'black';
		context.font = "bold 30px Arial"; 

		context.save();
			context.fillText( "OMMATIDIA", 100, 100 );	
		context.restore();

		context.font = "10px Arial";
		context.fillText( "Use Arrows to move. Press Z to start", 100, 150 );

		context.fillText( "Graham Smith 2023", 100, 200 );
	}
}