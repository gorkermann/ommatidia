import { Vec2 } from './lib/juego/Vec2.js'
import { Line } from './lib/juego/Line.js'
import { Material, RGBAtoFillStyle} from './lib/juego/Material.js'
import { RayHit, closestTo } from "./lib/juego/RayHit.js"
import { Shape } from './lib/juego/Shape.js'
import { Dict } from './lib/juego/util.js'

import { COL, MILLIS_PER_FRAME } from './collisionGroup.js'

class ShapeHit extends RayHit {
	shape: Shape;
	dist: number;
	incidentDot: number;

	constructor( point: Vec2, normal: Vec2, material: Material ) {
		super( point, normal, material );
	}
}

function shapecast( line: Line, shapes: Array<Shape> ): Array<ShapeHit> {
	let closestRayHits: Array<ShapeHit> = [];

	for ( let shape of shapes ) {
		if ( !shape.material ) continue;

		let rayHits: Array<RayHit> = shape.rayIntersect( line );

		if ( rayHits.length > 0 ) {
			let shapeHit = new ShapeHit( rayHits[0].point, rayHits[0].normal, rayHits[0].material );
			shapeHit.vel = shape.getVel( shapeHit.point );
			shapeHit.shape = shape;
			shapeHit.incidentDot = line.p2.minus( line.p1 ).normalize().dot( shapeHit.normal );

			closestRayHits.push( shapeHit );
		}
	}
	
	closestRayHits.sort( closestTo( line.p1 ) );

	return closestRayHits;	
}

class SliceInfo {
	angle: number;
	slice: number;
	hits: Array<ShapeHit>; 

	constructor( angle: number, slice: number, hits: Array<ShapeHit> ) {
		this.angle = angle;
		this.slice = slice;
		this.hits = hits;
	}
}

function getHits( shapes: Array<Shape>,
				  origin: Vec2,
				  slices: Array<number> ): Array<SliceInfo> {
	let output: Array<SliceInfo> = [];

	let angle = 0;
	let opaqueIndex = 0;

	for ( let slice of slices ) {
		angle += slice / 2;

		let hits = shapecast( new Line( origin.x, 
										origin.y,
									    origin.x + Math.cos( angle ) * 117.5 / 4, 
									    origin.y + Math.sin( angle ) * 117.5 / 4 ), shapes );

		opaqueIndex = -1;
		for ( let j = 0; j < hits.length; j++ ) {
			if ( hits[j].material.alpha == 1.0 ) {
				opaqueIndex = j;
				break;
			}
		}

		//hits = [];

		if ( opaqueIndex < 0 ) {
			hits = shapecast( new Line( origin.x, 
										origin.y,
									    origin.x + Math.cos( angle ) * 1000, 
									    origin.y + Math.sin( angle ) * 1000 ), shapes );
		}

		if ( hits.length > 0 ) {
			for ( let hit of hits ) {
				hit.dist = hit.point.minus( origin ).length();
			}
		
			output.push( new SliceInfo( angle, slice, hits ) );

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

type SliderVal = {
	id: string,
	val: number;
}

export let vals: Dict<SliderVal> = {
	satFactor: {
		id: 'sat-factor',
		val: 65,
	},
	satPower: {
		id: 'sat-power',
		val: 1,
	},
	lumFactor: {
		id: 'lum-factor',
		val: 160,
	},
	lumPower: {
		id: 'lum-power',
		val: 1,
	},
	shading: {
		id: 'shading',
		val: 0.75,
	},
	lens: {
		id: 'lens',
		val: 2,
	}
}

function highlightCorners( hit: ShapeHit, prevHit: ShapeHit, nextHit: ShapeHit, ) {
	let score = 0.0;

	// distance
	if ( prevHit === null || nextHit === null ) {
		score = 1.0;

	} else if ( hit.dist - prevHit.dist > 10 ||
				hit.dist - nextHit.dist > 10 ) {
		score = 0.0;

	} else if ( ( hit.dist - prevHit.dist < -10 && hit.shape != prevHit.shape ) ||
				( hit.dist - nextHit.dist < -10 && hit.shape != nextHit.shape ) ) {
		score = 1.0;
	}

	/*
	// angle
	let dot = prevHit ? prevHit.normal.dot( hit.normal ) : -1;
	let nextDot = nextHit ? nextHit.normal.dot( hit.normal ) : -1;
	if ( nextDot < dot ) dot = nextDot;

	if ( dot <= 0 ) { // angles greater than 90 get a full score
		//score *= 1.0;

	} else if ( dot < 0.707 ) { // angles from 45-90 get proportionally brighter
		//score *= ( 0.707 - dot ) / 0.707;
	
	} else { // angles less than 45 get nothing
		score *= 0;
	}*/

	hit.material.hue += score * 10 * hit.material.alpha;

	// specular highlight
	if ( hit.incidentDot < 0 ) {
	//	hit.material.lum *= 1 - vals.shading.val * hit.incidentDot;
	}
}

let warnCos = -Math.cos( Math.PI * 15 / 180 );
let warnRadius = 200; // pixels
let warnTime = 5000; // milliseconds
let binSize = 40;
let minPeriod = 200; // milliseconds
let zeroVector = new Vec2( 0, 0 );

function approachFlash( eyeVel: Vec2, hit: ShapeHit, angle: number, hitDist: number ) {
	if ( hit.shape && hit.shape.parent && 
		 hit.shape.parent.collisionGroup != COL.ENEMY_BULLET ) return;

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

/*let satFactorVal;
let lumFactorVal;

function updateFactorVals() {
	satFactorVal = satFactor ** ( satPower / 0.5 );
	lumFactorVal = lumFactor ** ( lumPower / 0.5 );
}*/

for ( let valName in vals ) {
	let slider = document.getElementById( vals[valName].id ) as HTMLInputElement;
	if ( !slider ) continue;

	slider.value = vals[valName].val.toString();

	slider.onchange = function( e: any ) {
		let inputVal = parseFloat( e.currentTarget.value );
		if ( !isNaN( inputVal ) ) vals[valName].val = inputVal;
	}
}

export function renderFromEye( context: CanvasRenderingContext2D, 
							   shapes: Array<Shape>,
							   origin: Vec2,
							   vel: Vec2,
							   slices: Array<number>,
							   or: number, ir: number ) {
	
	let sliceInfos = getHits( shapes, origin, slices );
	let blended;

	for ( let i = 0; i < sliceInfos.length; i++ ) {
		if ( !sliceInfos[i] ) continue;

		let angle = sliceInfos[i].angle;
		let slice = sliceInfos[i].slice;
		let hitDist = sliceInfos[i].hits[0].dist;

		let hits = sliceInfos[i].hits;

		let opaqueIndex = hits.length - 1;
		for ( let j = 0; j < hits.length; j++ ) {
			if ( hits[j].material.alpha == 1.0 ) {
				opaqueIndex = j;
				break;
			}
		}

		//context.globalAlpha = 1 / ( Math.sqrt( hitDist ) / 10 );
		//context.globalAlpha = 1 / ( hitDist / 20 );

		// highlight corners and edges of shapes
		let prevInfo = sliceInfos[(i + sliceInfos.length - 1) % sliceInfos.length];
		let nextInfo = sliceInfos[(i + 1) % sliceInfos.length];

		highlightCorners( hits[0], ( prevInfo ? prevInfo.hits[0] : null ), ( nextInfo ? nextInfo.hits[0] : null ))
		approachFlash( vel, hits[0], angle, hitDist );

		blended = { r: 0, g: 0, b: 0, a: 1.0 }; // background color

		for ( let j = opaqueIndex; j >= 0; j-- ) {
			hits[j].material.sat *= Math.min( vals.satFactor.val / ( hits[j].dist ** vals.satPower.val ), 1.0 ); 
			hits[j].material.lum *= Math.min( vals.lumFactor.val / ( hits[j].dist ** vals.lumPower.val ), 1.0 );
			let color = hits[j].material.getRGBA();

			blended.r = color.r * color.a + blended.r * ( 1 - color.a );
			blended.g = color.g * color.a + blended.g * ( 1 - color.a );
			blended.b = color.b * color.a + blended.b * ( 1 - color.a );
 			//hits[j].material.blendWith( blended );
		}

		// draw the segment
		//blended.s *= Math.min( vals.satFactor.val / ( hitDist ** vals.satPower.val ), 1.0 ); 
		//blended.l *= blended.a * Math.min( vals.lumFactor.val / ( hitDist ** vals.lumPower.val ), 1.0 );
		blended.a = 1.0;
		context.strokeStyle = RGBAtoFillStyle( blended );
		context.fillStyle = RGBAtoFillStyle( blended );

		context.beginPath();
		context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
		context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
		context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
		context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
		context.closePath();
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

export function whiteText( context: CanvasRenderingContext2D, text: string, posX: number, posY: number, rightAlign: boolean=false ) {
	context.font = "14px Monospace";

	let w = context.measureText( text ).width;
	let x = posX;
	if ( rightAlign ) {
		x = posX - w - 2;
	}

	context.fillStyle = 'black';
	context.fillRect( x, posY, w + 2, 20 );
	context.fillStyle = 'white';
	context.fillText( text, x + 1, posY + 20 - 5 );
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