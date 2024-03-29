import { Camera } from './lib/juego/Camera.js'
import { Entity } from './lib/juego/Entity.js'
import { EntityManager } from './lib/juego/EntityManager.js'

///////////
// SCENE //
///////////

/*
	Parent class for cutscenes and levels
*/

export type SceneDrawOptions = {
	noConsole?: boolean;
}

export class Scene {
	name: string = '';
	isLoaded: boolean = false;
	camera: Camera = new Camera();
	em: EntityManager = new EntityManager();

	final: boolean = false;
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

	describe( entity: Entity ) {}

	draw( context: CanvasRenderingContext2D, drawOptions: SceneDrawOptions={} ) {}
}