import { Camera } from './lib/juego/Camera.js'
import { EntityManager } from './lib/juego/EntityManager.js'

///////////
// SCENE //
///////////

/*
	Parent class for cutscenes and levels
*/

export class Scene {
	name: string = '';
	isLoaded: boolean = false;
	camera: Camera = new Camera();
	em: EntityManager = new EntityManager();

	messages: Array<string> = [];

	constructor( name: string ) {
		this.name = name;
	}

	load(): Promise<any> {
		// dummy load function

		let _this: Scene = this;

		return new Promise( function(resolve, reject) {
			_this.isLoaded = true;

			resolve(0);
		});
	}

	wake(): void {}

	sleep(): void {}

	reset() {}

	update() {}

	draw( context: CanvasRenderingContext2D ) {}
}