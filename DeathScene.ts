import { Scene } from "./lib/juego/Scene.js"
import { Entity } from "./lib/juego/Entity.js"
import { Keyboard, KeyCode } from "./lib/juego/keyboard.js"
import { Text } from "./lib/juego/Menu.js"
import { Color } from "./lib/juego/Colors.js"

export class DeathScene extends Scene {
	name: string = "";
	deaths: number = 0;

	boundKeyHandler = this.keyHandler.bind(this);

	startTime: number = 0;

	constructor() {
		super( "Title" );
	}

	wake() {
		document.addEventListener( "keydown", this.boundKeyHandler );

		this.deaths += 1;
		this.startTime = new Date().getTime();
	}

	sleep() {
		document.removeEventListener( "keydown", this.boundKeyHandler );
	}

	keyHandler( e: any) {

	}

	update() {
		if ( new Date().getTime() - this.startTime > 2000 ) {
			document.dispatchEvent( new CustomEvent( "restart" ) );
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		context.fillStyle = 'black';
		context.font = "10px Arial";

		context.fillText( "Deaths: " + this.deaths, 100, 150 );
	}
}

