import { Vec2 } from './lib/juego/Vec2.js'
import { Line } from './lib/juego/Line.js'
import { RayHit, closestTo } from "./lib/juego/RayHit.js"
import { Shape } from './lib/juego/Shape.js'

function shapecast( line: Line, shapes: Array<Shape> ): RayHit | null {
	let closestRayHits: Array<RayHit> = [];

	for ( let shape of shapes ) {
		if ( !shape.material ) continue;

		let rayHits: Array<RayHit> = shape.rayIntersect( line );

		if ( rayHits.length > 0 ) {
			if ( shape.parent ) {
				let p = rayHits[0].point.minus( shape.parent.pos );
				if ( shape.parent.relPos ) {
					p.add( shape.parent.relPos.turned( shape.parent.angle ) );
				}

				let p2 = p.turned( shape.parent.angleVel );

				rayHits[0].vel = shape.parent.vel.plus( p2.minus( p ) );
			}

			closestRayHits.push( rayHits[0] );

		}
	}

	if ( closestRayHits.length > 0 ) {
		closestRayHits.sort( closestTo( line.p1 ) );

		return closestRayHits[0]; 
	} else {
		return null;
	}	
} 

export function renderFromEye( context: CanvasRenderingContext2D, 
							   shapes: Array<Shape>,
							   origin: Vec2,
							   slices: Array<number>,
							   or: number, ir: number ) {
	let angle = 0;

	for ( let slice of slices ) {
		angle += slice / 2;

		let dir = new Vec2( Math.cos( angle ), Math.sin( angle ) );

		let hit = shapecast( new Line( origin.x, origin.y,
									   origin.x + Math.cos( angle ) * 1000, 
									   origin.y + Math.sin( angle ) * 1000 ), shapes );
		let hitDist = -1;
		if ( hit !== null ) {
			hitDist = hit.point.minus( origin ).length();
		}

		/*let redness = 0;

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Coin ) {
				let floaterPos = entity.pos.copy();
				let floaterDir = floaterPos.minus( origin ).normalize();
				let floaterDist = floaterPos.minus( origin ).length();

				if ( hit !== null && floaterDist > hitDist ) {
					continue;
				}

				let floatDot = dir.dot( floaterDir );
				if ( floatDot > 0.995 ) {
					let intensity = ( floatDot - 0.995 ) / 0.1;
					intensity *= 1 / ( floaterPos.minus( origin ).length() / 200 );

					redness += intensity; 
				}
			}
		}
		if ( redness > 1.0 ) redness = 1.0;*/

		if ( hit !== null ) {
			/*context.beginPath();
			context.moveTo( origin.x, origin.y );
			context.lineTo( hit.point.x, hit.point.y );
			context.stroke();
			*/

			context.globalAlpha = 1 / ( Math.sqrt( hitDist ) / 3 );
			//context.globalAlpha = 1 / ( hitDist / 20 );

			if ( hit.vel && hit.vel.unit().dot( dir ) < -0.966 && hitDist < 200 ) {
				let bin = Math.floor( hitDist / 20 ) + 1;

				let warn = new Date().getTime() % ( bin * 200 ) / ( bin * 200 ) * Math.PI * 2;

				hit.material.hue += Math.sin( warn ) * 16 - 8;
				hit.material.lum += Math.sin( warn ) / 10;
				//hit.material.lum %= 1;
			}

			context.fillStyle = hit.material.getFillStyle();

			context.beginPath();
			context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
			context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
			context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
			context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
			context.fill();
			
			context.globalAlpha = 1.0;

			/*context.fillStyle = 'rgb(' + 255 + ', 0, 0)';
			context.globalAlpha = redness;
			context.save();
				context.translate( 200, 200 );
				context.beginPath();
				context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
				context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
				context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
				context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
				context.fill();
			context.restore();
			context.globalAlpha = 1.0;*/
		}

		angle += slice / 2;
	}
}

export function getDownsampled( canvas: HTMLCanvasElement, 
								context: CanvasRenderingContext2D,
								w: number ): ImageData {
	let wSq = w ** 2;
	let subW = Math.floor( canvas.width / w );
	let subH = Math.floor( canvas.height / w );

	let data = context.createImageData( subW, subH );

	//let data: Array<number> = [];
	//data[subW * subH * 4] = 0;
	//data.fill( 0 );

	// downsample
	let imageData = context.getImageData( 0, 0, canvas.width, canvas.height );
	for ( let i = 0; i < data.data.length; i += 4 ) {
		let pix = Math.floor( i / 4 );

		let x = ( pix % subW ) * w;
		let y = Math.floor( pix / subW ) * w;

		let bucket: Array<number> = [0, 0, 0, 0];

		for ( let j = 0; j < 4; j++ ) {
			for ( let ix = 0; ix < w; ix++ ) {
				for ( let iy = 0; iy < w; iy++ ) {
					bucket[j] += imageData.data[((y + iy) * canvas.width + x + ix) * 4 + j] / wSq;	
				}
			}
		
			data.data[i + j] = bucket[j];
		}
	}

	// upsample
	let data2 = context.createImageData( canvas.width, canvas.height );
	for ( let i = 0; i < data2.data.length; i += 4 ) {
		let pix = Math.floor( i / 4 );

		let sx = Math.floor( ( pix % canvas.width ) / w );
		let sy = Math.floor( pix / canvas.width / w );

		for ( let j = 0; j < 4; j++ ) {
			data2.data[i + j] = data.data[(sy * subW + sx) * 4 + j];
		}
	}

	return data2;

	//function imagedata_to_image(imagedata) {
	    var canvas = document.createElement('canvas');
	    var ctx = canvas.getContext('2d');
	    canvas.width = data.width;
	    canvas.height = data.height;
	    ctx.putImageData(data, 0, 0);

	    var image = new Image();
	    image.src = canvas.toDataURL();
	    //return image;
	//}

	context.save();
		//context.scale( w/2, w/2 );
		//context.putImageData( data2, 0, 0 );
	context.restore();
}

export function whiteText( context: CanvasRenderingContext2D, text: string, posX: number, posY: number ) {
	context.font = "10px Arial";

	let w = context.measureText( text ).width;

	context.fillStyle = 'black';
	context.fillRect( posX, posY, w + 2, 13 );
	context.fillStyle = 'white';
	context.fillText( text, posX + 1, posY + 13 - 3 );
}