import { Entity } from './lib/juego/Entity.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Scene } from './lib/juego/Scene.js'

import { getDownsampled } from './render.js'
 
let downsampled: ImageData = null;
let upsampled: ImageData = null;

export class FloaterScene extends Scene {
	floaters: Array<Entity> = [];
	startTime: number = new Date().getTime();
	hue: number = Math.random() * 360;

	canvas: HTMLCanvasElement;

	constructor( canvas: HTMLCanvasElement ) {
		super( "Floaters" );

		this.canvas = canvas;
	}

	update() {
		if ( new Date().getTime() - this.startTime > 1000 && this.floaters.length < 10 ) {
			this.startTime = new Date().getTime();

			let angle = Math.random() * Math.PI * 2;
			let speed = Math.random() * 5 + 1;
			let origin = new Vec2( 200, 200 );

			let floater = new Entity( origin.plus( Vec2.fromPolar( angle, 400 ) ),
									  Math.random() * 80 + 10, Math.random() * 80 + 10 );

			if ( this.floaters.length > 0 ) {
				let deg = Math.PI / 180;
				angle += Math.random() * deg*40  - deg*20;
			}

			floater.vel = new Vec2( -Math.cos( angle ) * speed, -Math.sin( angle ) * speed );
			floater.material = new Material( this.hue, 1.0, 0.5 );

			this.hue += Math.random() * 3 + 3;

			this.floaters.push( floater );
		}

		for ( let floater of this.floaters ) {
			floater.pos.add( floater.vel );
		}

		for ( let i = this.floaters.length - 1; i >= 0; i-- ) {
			if ( new Vec2( this.floaters[i].pos.x - 200, this.floaters[i].pos.y - 200 ).length() > 500 ) {
				this.floaters.splice( i, 1 );
			} 
		}
	}

	draw( context: CanvasRenderingContext2D ) {
		if ( !this.canvas ) return;

		context.globalAlpha = 0.1;

		context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		for ( let floater of this.floaters ) {
			floater.draw( context );
		}

		if ( !upsampled ) upsampled = context.createImageData( this.canvas.width, this.canvas.height );

		getDownsampled( this.canvas, context, 16, upsampled );
		context.putImageData( upsampled, 0, 0 );

		context.globalAlpha = 1.0;
	}
}