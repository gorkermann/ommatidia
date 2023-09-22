import { Vec2 } from './lib/juego/Vec2.js'
import { Line } from './lib/juego/Line.js'
import { Material, toFillStyle} from './lib/juego/Material.js'
import { RayHit, closestTo } from "./lib/juego/RayHit.js"
import { Shape } from './lib/juego/Shape.js'

import { MILLIS_PER_FRAME } from './collisionGroup.js'

function shapecast( line: Line, shapes: Array<Shape> ): Array<RayHit> {
	let closestRayHits: Array<RayHit> = [];

	for ( let shape of shapes ) {
		if ( !shape.material ) continue;

		let rayHits: Array<RayHit> = shape.rayIntersect( line );

		if ( rayHits.length > 0 ) {
			rayHits[0].vel = shape.getVel( rayHits[0].point );

			closestRayHits.push( rayHits[0] );
		}
	}

	
	closestRayHits.sort( closestTo( line.p1 ) );

	return closestRayHits;	
}

class SliceInfo {
	angle: number;
	slice: number;
	hits: Array<RayHit>; 
	hitDist: number; // distance to first hit

	constructor( angle: number, slice: number, hits: Array<RayHit>, hitDist: number ) {
		this.angle = angle;
		this.slice = slice;
		this.hits = hits;
		this.hitDist = hitDist;
	}
}

function getHits( shapes: Array<Shape>,
				  origin: Vec2,
				  slices: Array<number> ): Array<SliceInfo> {
	let output: Array<SliceInfo> = [];

	let angle = 0;

	for ( let slice of slices ) {
		angle += slice / 2;

		let hits = shapecast( new Line( origin.x, origin.y,
									   origin.x + Math.cos( angle ) * 1000, 
									   origin.y + Math.sin( angle ) * 1000 ), shapes );
		if ( hits.length > 0 ) {
			let hitDist = hits[0].point.minus( origin ).length();
		
			output.push( new SliceInfo( angle, slice, hits, hitDist ) );

		} else {
			output.push( null );
		}

		angle += slice / 2;
	}

	return output;
}

export function renderRays( context: CanvasRenderingContext2D, 
						    shapes: Array<Shape>,
						    origin: Vec2,
						    slices: Array<number> ) {
	
	let sliceInfos = getHits( shapes, origin, slices );

	for ( let sliceInfo of sliceInfos ) {
		if ( !sliceInfo ) continue;

		let hit = sliceInfo.hits[0];

		context.strokeStyle = 'black';
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo( origin.x, origin.y );
		context.lineTo( hit.point.x, hit.point.y );
		context.stroke();

		let n = hit.point.plus( hit.normal.times( 10 ) );

		context.strokeStyle = 'blue';
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo( hit.point.x, hit.point.y );
		context.lineTo( n.x, n.y );
		context.stroke();
	}
}

let warnCos = -Math.cos( Math.PI * 15 / 180 );
let warnRadius = 200; // pixels
let warnTime = 5000; // milliseconds
let binSize = 40;
let minPeriod = 200; // milliseconds
let zeroVector = new Vec2( 0, 0 );

function highlightCorners( hit: RayHit, prevHit: RayHit, nextHit: RayHit ) {
	let score = 0.0;

	if ( prevHit === null || nextHit === null ) {
		score = 1.0;
	} else {
		let dot = prevHit.normal.dot( hit.normal );
		let nextDot = nextHit.normal.dot( hit.normal );
		if ( nextDot < dot ) dot = nextDot;

		if ( dot <= 0 ) {
			score = 1.0;
		} else if ( dot < 0.866 ) {
			score = ( 0.866 - dot ) / 0.866;
		}
	}

	hit.material.hue += score * 10;
	//hit.material.lum *= ( 1 - score * 0.6 );
}

function approachFlash( eyeVel: Vec2, hit: RayHit, angle: number, hitDist: number ) {
	let dir = new Vec2( Math.cos( angle ), Math.sin( angle ) );

	let vel = hit.vel.minus( eyeVel );

	if ( vel && !hit.vel.equals( zeroVector ) && // shape is moving 
		 vel.unit().dot( dir ) < warnCos && // shape is moving toward viewer
		 hitDist < warnRadius ) { // shape is close

		let timeToImpact = hitDist / vel.length() * MILLIS_PER_FRAME;

		if ( timeToImpact < warnTime ) {
			//let period = ( Math.floor( hitDist / binSize ) + 1 ) * minPeriod;
			let period = ( Math.floor( timeToImpact / 1000 ) + 1 ) * minPeriod;
			let warn = ( ( new Date().getTime() % period ) / period ) * Math.PI * 2;

			hit.material.hue += Math.sin( warn ) * 16 - 8;
			hit.material.lum += Math.sin( warn ) / 10;
		}
	}
}

export function renderFromEye( context: CanvasRenderingContext2D, 
							   shapes: Array<Shape>,
							   origin: Vec2,
							   vel: Vec2,
							   slices: Array<number>,
							   or: number, ir: number ) {
	
	let sliceInfos = getHits( shapes, origin, slices );

	for ( let i = 0; i < sliceInfos.length; i++ ) {
		if ( !sliceInfos[i] ) continue;

		let angle = sliceInfos[i].angle;
		let slice = sliceInfos[i].slice;
		let hitDist = sliceInfos[i].hitDist;

		let hits = sliceInfos[i].hits;

		let opaqueIndex = hits.length - 1;
		for ( let j = 0; j < hits.length; j++ ) {
			if ( hits[j].material.alpha == 1.0 ) {
				opaqueIndex = j;
				break;
			}
		}

		context.globalAlpha = 1 / ( Math.sqrt( hitDist ) / 3 );
		//context.globalAlpha = 1 / ( hitDist / 20 );

		// highlight corners and edges of shapes
		let prevInfo = sliceInfos[(i + sliceInfos.length - 1) % sliceInfos.length];
		let nextInfo = sliceInfos[(i + 1) % sliceInfos.length];

		highlightCorners( hits[0], ( prevInfo ? prevInfo.hits[0] : null ), ( nextInfo ? nextInfo.hits[0] : null ))
		approachFlash( vel, hits[0], angle, hitDist );

		let blended = { h: 0, s: 0, l: 1.0, a: 1.0 }; // l=1.0 for white background
		for ( let j = opaqueIndex; j >= 0; j-- ) {
			hits[j].material.blendWith( blended );
		}

		// draw the segment
		context.fillStyle = toFillStyle( blended );

		context.beginPath();
		context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
		context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
		context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
		context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
		context.fill();
		
		context.globalAlpha = 1.0;
	}

	/*context.strokeStyle = 'black';
	context.lineWidth = 1;
	context.globalAlpha = 0.2;

	for ( let i = 0; i < sliceInfos.length; i++ ) {
		if ( !sliceInfos[i] ) continue;

		let angle = sliceInfos[i].angle;
		let slice = sliceInfos[i].slice;
		let hit = sliceInfos[i].hit;
		let hitDist = sliceInfos[i].hitDist;
		let prevHit = sliceInfos[(i + sliceInfos.length - 1) % sliceInfos.length];
		let nextHit = sliceInfos[(i + 1) % sliceInfos.length];

		if ( prevHit === null || 
			 prevHit.hit.normal.dot( hit.normal ) < 0.866 ) {

			context.beginPath();
			context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
			context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
			context.stroke();
		}

		if ( nextHit === null || 
			 nextHit.hit.normal.dot( hit.normal ) < 0.866 ) {

			context.beginPath();
			context.moveTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
			context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
			context.stroke();
		}
	}
	context.globalAlpha = 1.0;*/

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
}

let canvasData: ImageData;
let downsampled: ImageData;

export function getDownsampled( canvas: HTMLCanvasElement, 
								context: CanvasRenderingContext2D,
								w: number,
								upsampled: ImageData ) {
	let wSq = w ** 2;
	let subW = Math.floor( canvas.width / w );
	let subH = Math.floor( canvas.height / w );

	//let data: Array<number> = [];
	//data[subW * subH * 4] = 0;
	//data.fill( 0 );

	// downsample
	if ( !downsampled ) downsampled = context.createImageData( subW, subH );

	canvasData = context.getImageData( 0, 0, canvas.width, canvas.height );
	for ( let i = 0; i < downsampled.data.length; i += 4 ) {
		let pix = Math.floor( i / 4 );

		let x = ( pix % subW ) * w;
		let y = Math.floor( pix / subW ) * w;

		let bucket: Array<number> = [0, 0, 0, 0];

		for ( let j = 0; j < 4; j++ ) {
			for ( let ix = 0; ix < w; ix++ ) {
				for ( let iy = 0; iy < w; iy++ ) {
					bucket[j] += canvasData.data[((y + iy) * canvas.width + x + ix) * 4 + j] / wSq;	
				}
			}
		
			downsampled.data[i + j] = bucket[j];
		}
	}

	// upsample
	for ( let i = 0; i < upsampled.data.length; i += 4 ) {
		let pix = Math.floor( i / 4 );

		let sx = Math.floor( ( pix % canvas.width ) / w );
		let sy = Math.floor( pix / canvas.width / w );

		for ( let j = 0; j < 4; j++ ) {
			upsampled.data[i + j] = downsampled.data[(sy * subW + sx) * 4 + j];
		}
	}
}

export function whiteText( context: CanvasRenderingContext2D, text: string, posX: number, posY: number ) {
	context.font = "10px Arial";

	let w = context.measureText( text ).width;

	context.fillStyle = 'black';
	context.fillRect( posX, posY, w + 2, 13 );
	context.fillStyle = 'white';
	context.fillText( text, posX + 1, posY + 13 - 3 );
}

/*
	render imagedata to image

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
 */