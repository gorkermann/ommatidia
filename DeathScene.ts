import { Scene } from "./lib/juego/Scene.js"
import { Entity } from "./lib/juego/Entity.js"
import { Keyboard, KeyCode } from "./lib/juego/keyboard.js"
import { Text } from "./lib/juego/Menu.js"

import { whiteText } from './render.js'

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
		whiteText( context, "Deaths: " + this.deaths, 200, 200 );
	}
}

