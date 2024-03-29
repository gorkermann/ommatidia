import ws281x from 'rpi-ws281x-native'

import { Angle } from './lib/juego/Angle.js'
import { Entity } from './lib/juego/Entity.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Line } from './lib/juego/Line.js'
import { RGBA, Material, RGBAtoFillStyle } from './lib/juego/Material.js'
import { RayHit, closestTo } from "./lib/juego/RayHit.js"
import { Shape, ShapeHit } from './lib/juego/Shape.js'
import { Dict } from './lib/juego/util.js'

import { COL, MILLIS_PER_FRAME } from './collisionGroup.js'
import * as Debug from './Debug.js'

import { XhrInterface } from './NodeServer.js'

let channel: any;

if ( typeof document === 'undefined' ) {
	channel = ws281x(144, { stripType: 'ws2812', gpio: 18 } );
}

export function shapecast( line: Line, shapes: Array<Shape>, minSweep: Array<number>=null, maxSweep: Array<number>=null ): Array<ShapeHit> {
	let closestRayHits: Array<ShapeHit> = [];
	let v = line.p2.minus( line.p1 );
	let angle = v.angle();

	for ( let i = 0; i < shapes.length; i++ ) {
		let shape = shapes[i];

		if ( !shape.material ) continue;
		if ( minSweep && maxSweep && !Angle.between( angle, minSweep[i], maxSweep[i] ) ) continue;

		let hits = shape.rayIntersect( line );

		for ( let i = 0; i < hits.length; i++ ) {
			if ( hits[i].material.alpha == 0.0 ) continue;

			hits[i].vel = shape.getVel( hits[i].point );
			hits[i].shape = shape;
			hits[i].incidentDot = line.p2.minus( line.p1 ).unit().dot( hits[i].normal );

			// inside shape
			if ( hits[i].incidentDot > 0 ) {
				hits[i].incidentDot *= -1;
				hits[i].normal.flip();
			}

			hits[i].normalDist = -hits[i].incidentDot * hits[i].dist;

			closestRayHits.push( hits[i] );

			if ( hits[i].material.alpha == 1.0 ) break;
		}
	}

	closestRayHits.sort( ( a: ShapeHit, b: ShapeHit ) => a.dist - b.dist );

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

function getSlices( sliceCount: number ): Array<number> {
	sliceCount = Math.floor( sliceCount );
	if ( sliceCount <= 0 ) {
		console.error( 'render.getSlices(): Invalid slice count (' + sliceCount + ')' );
		return;
	}

	let slices: Array<number> = [];
	let slice = Math.PI * 2 / sliceCount;
	for ( let i = 0; i < sliceCount; i++ ) {
		slices.push( slice );
	}

	return slices;
}

function getHits( shapes: Array<Shape>,
				  origin: Vec2,
				  slices: Array<number> ): Array<SliceInfo> {
	let output: Array<SliceInfo> = [];

	let angle = 0;
	let opaqueIndex = 0;

	let minSweep = [];
	let maxSweep = [];

	for ( let shape of shapes ) {
		let [min, max] = Angle.getSweep( shape.points, origin );

		minSweep.push( min );
		maxSweep.push( max );
	}

	for ( let slice of slices ) {
		angle += slice / 2;

		let hits = shapecast( new Line( origin.x, 
										origin.y,
									    origin.x + Math.cos( angle ) * 1000, 
									    origin.y + Math.sin( angle ) * 1000 ), shapes, minSweep, maxSweep );

		if ( hits.length > 0 ) {
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
						    sliceCount: number ) {
	
	let sliceInfos = getHits( shapes, origin, getSlices( sliceCount ) );

	for ( let sliceInfo of sliceInfos ) {
		if ( !sliceInfo ) continue;

		let hit = sliceInfo.hits[0];

		context.strokeStyle = 'white';
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo( origin.x, origin.y );
		context.lineTo( hit.point.x, hit.point.y );
		context.stroke();
	}

	for ( let sliceInfo of sliceInfos ) {
		if ( !sliceInfo ) continue;
	
		let hit = sliceInfo.hits[0];
	
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
	default: number;
}

let sliceCount = 360;
let theta = Math.PI * 2 / sliceCount;
let cosSl = Math.cos( theta );
let sinSl = Math.sin( theta );

function highlightCorners( hit: ShapeHit, prevHit: ShapeHit, nextHit: ShapeHit, ) {
	let score = 0.0;

	// distance
	if ( prevHit === null || nextHit === null ) {
		score = 1.0;
	} else {
		let comps = [prevHit, nextHit];

		// expected distance to next/prev hit, assuming it is on the same plane as the current one
		let sin = Math.sqrt( 1 - hit.incidentDot ** 2 );
		let dMax = hit.normalDist / ( -hit.incidentDot * cosSl - sin * sinSl );
		let dMin = hit.normalDist / ( -hit.incidentDot * cosSl + sin * sinSl );

		for ( let comp of comps ) {

			// exterior corner of a shape against some background shape
			if ( hit.shape != comp.shape && comp.dist > dMax + 1 ) {
				score = 1.0;
			}

			// interior corner or flat made by two shapes
			if ( Debug.flags.HIGHLIGHT_INTERIOR_CORNERS || hit.material.cornerShaderIndex == 2 ) {
				if ( hit.shape != comp.shape && hit.normal.dot( comp.normal ) > -0.1 ) {
					score = 1.0;
				}
			}

			// corner of a single shape between two faces
			if ( hit.shape == comp.shape && hit.normal.dot( comp.normal ) < 0.1 ) {
				score = 1.0;
			}
		}
	}

	hit.material.highlightCorners( score );

	// specular highlight
	if ( hit.incidentDot < 0 ) {
		//hit.material.lum *= 1 - vals.shading.val * hit.incidentDot;
	}
}

let warnCos = -Math.cos( Math.PI * 15 / 180 );
let warnRadius = 200; // pixels
let warnTime = 5000; // milliseconds
let binSize = 40;
let minPeriod = 200; // milliseconds
let zeroVector = new Vec2( 0, 0 );

function approachFlash( eyeVel: Vec2, hit: ShapeHit, angle: number, hitDist: number ) {
	let group = 0;

	if ( hit.shape && hit.shape.parent ) {
		if ( hit.shape.parent.collisionGroup == COL.USE_ROOT ) {
			group = hit.shape.parent.getRoot().collisionGroup;

		} else {
			group = hit.shape.parent.collisionGroup;
		}
	}

	if ( group != COL.ENEMY_BULLET ) return;

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

export let vals: Dict<SliderVal> = {
	satFactor: {
		id: 'sat-factor',
		val: 300,
		default: 300,
	},
	satPower: {
		id: 'sat-power',
		val: 1.0,
		default: 1.0,
	},
	satMin: {
		id: 'sat-min',
		val: 0.3,
		default: 0.3,
	},	
	lumFactor: {
		id: 'lum-factor',
		val: 500,
		default: 500,
	},
	lumPower: {
		id: 'lum-power',
		val: 1.0,
		default: 1.0,
	},
	lumMin: {
		id: 'lum-min',
		val: 0.2,
		default: 0.2,
	},

	shading: {
		id: 'shading',
		val: 0.3,
		default: 0.3,
	},
	lens: {
		id: 'lens',
		val: 2,
		default: 2,
	},
}

if ( typeof document !== 'undefined' ) {
	for ( let valName in vals ) {
		let slider = document.getElementById( vals[valName].id ) as HTMLInputElement;
		if ( !slider ) continue;

		slider.value = vals[valName].val.toString();

		slider.onchange = function( e: any ) {
			let inputVal = parseFloat( e.currentTarget.value );
			if ( !isNaN( inputVal ) ) vals[valName].val = inputVal;
		}
	}
}

let rollingAvgDist = 0;
let rollingFactor = 0.01;

function rescale( x: number ): number {
	x *= 255;
	x -= 32;

	if ( x < 0 ) return 0;

	return Math.min( 2 ^ ( x / 16 ), 255 );
}

export function renderFromEye( context: CanvasRenderingContext2D, 
							   shapes: Array<Shape>,
							   origin: Vec2,
							   vel: Vec2,
							   sliceCount: number,
							   or: number, ir: number ) {

	let slices = getSlices( sliceCount );

	let blendedSegments = getFrame( shapes, origin, vel, slices );
	if ( blendedSegments.length != sliceCount ) {
		console.error( 'render.renderFromEye(): Slice count mismatch: ' + blendedSegments.length + ' != ' + sliceCount );
		return;
	}

	for ( let i = 0; i < sliceCount; i++ ) {
		blendedSegments[i].a = 1.0;
	}

	if ( typeof document !== 'undefined' ) {
		let angle = 0;

		for ( let i = 0; i < sliceCount; i++ ) {
			let slice = slices[i];
			let sliceWipe = Math.atan( 1 / or ); // nudge the slices to cover the small gap between them
			angle += slice / 2;

			context.strokeStyle = RGBAtoFillStyle( blendedSegments[i] );
			context.fillStyle = RGBAtoFillStyle( blendedSegments[i] );
			context.beginPath();
			context.moveTo( Math.cos( angle - slice / 2 - sliceWipe ) * ir, Math.sin( angle - slice / 2 - sliceWipe ) * ir );
			context.lineTo( Math.cos( angle - slice / 2 - sliceWipe ) * or, Math.sin( angle - slice / 2 - sliceWipe ) * or );
			context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
			context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
			context.closePath();
			context.fill();

			angle += slice / 2;
		}

		context.globalAlpha = 1.0;
	}

	let segs = [];
	for ( let segment of blendedSegments ) {
		let max = Math.max( segment.r, segment.g, segment.b );
		//let factor = max * 255 - 0;
		//if ( factor < 0 ) factor = 0;
		//factor = Math.min( 2 ^ ( factor / 16 ), 255 );
		let factor = 10;

		segs.push( ( segment.r * factor << 16 ) + ( segment.g * factor << 8 ) + ( segment.b * factor ) );
	}

	// optionally send to external server
	if ( Debug.flags.SEND_SERVER_FRAME ) {
		XhrInterface.post( 'render', { slices: segs } );
	}

	// optionally send to local GPIO
	if ( typeof document === 'undefined' ) {
		let offset = parseInt( Debug.fields['SLICE_OFFSET'].value );
		if ( isNaN( offset ) ) offset = 0;

		for ( let i = 0; i < channel.array.length; i++ ) {
	        channel.array[i] = 0;
	    }
	    for (let i = 0; i < channel.array.length; i++) {
	    	if ( i >= segs.length ) break;

	        channel.array[i] = segs[(i + offset ) % sliceCount] & 0xffffff;
	    }

	    ws281x.render();
	
		//console.log( 'leds' );
	}

	//console.log( 'render' );
}

function getFrame( shapes: Array<Shape>,
				   origin: Vec2,
				   vel: Vec2,
				   slices: Array<number> ): Array<RGBA> {
	let sliceInfos = getHits( shapes, origin, slices );
	let blended;
	let maxDist = -1;
	let lumFactor, satFactor: number;

	let output: Array<RGBA> = [];

	if ( Debug.flags.AUTO_BRIGHT_ADJUST ) {
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

			if ( hits[opaqueIndex].dist > maxDist ) {
				maxDist = hits[opaqueIndex].dist;
			}
		}

		if ( rollingAvgDist == 0 ) {
			rollingAvgDist = maxDist;
		} else {
			rollingAvgDist = ( 1 - rollingFactor ) * rollingAvgDist + rollingFactor * maxDist;
		}
	}

	for ( let i = 0; i < sliceInfos.length; i++ ) {
		if ( !sliceInfos[i] ) {
			output.push( { r: 0, g: 0, b: 0, a: 0 } );
			continue;
		}

		let angle = sliceInfos[i].angle;
		let hitDist = sliceInfos[i].hits[0].dist;

		let hits = sliceInfos[i].hits;

		let opaqueIndex = hits.length - 1;
		for ( let j = 0; j < hits.length; j++ ) {
			let a = hits[j].material.alpha;

			if ( hits[j].shape && hits[j].shape.parent ) {
				a *= hits[j].shape.parent.getAlpha();
			}

			if ( a == 1.0 ) {
				opaqueIndex = j;
				break;
			}
		}

		//context.globalAlpha = 1 / ( Math.sqrt( hitDist ) / 10 );
		//context.globalAlpha = 1 / ( hitDist / 20 );

		/* highlight corners and edges of shape*/

		let prevInfo = sliceInfos[(i + sliceInfos.length - 1) % sliceInfos.length];
		let nextInfo = sliceInfos[(i + 1) % sliceInfos.length];

		if ( Debug.flags.HIGHLIGHT_CORNERS ) {
			highlightCorners( hits[0], ( prevInfo ? prevInfo.hits[0] : null ), ( nextInfo ? nextInfo.hits[0] : null ))
		}

		/* make dangerous objects flash */

		approachFlash( vel, hits[0], angle, hitDist );

		/* draw slice */

		blended = { r: 0, g: 0, b: 0, a: 1.0 }; // background color

		let distCutoff = vals.lumFactor.val;
		if ( Debug.flags.AUTO_BRIGHT_ADJUST ) distCutoff = rollingAvgDist;

		for ( let j = opaqueIndex; j >= 0; j-- ) {
			
			//satFactor = Math.min( vals.satFactor.val / ( hits[j].dist ** vals.satPower.val ), 1.0 );
			satFactor = Math.min( ( vals.satFactor.val - hits[j].dist ) / ( vals.satFactor.val - 10 ), 1.0 );
			satFactor = Math.max( satFactor, vals.satMin.val );

			hits[j].material.sat *= Math.max( hits[j].material.emit, satFactor );
			

			//lumFactor = Math.min( vals.lumFactor.val / ( hits[j].dist ** vals.lumPower.val ), 1.0 );
			lumFactor = Math.min( ( distCutoff - hits[j].dist ) / ( distCutoff - 10 ), 1.0 );
			lumFactor = Math.max( lumFactor, vals.lumMin.val );

			// specular highlight
			if ( hits[j].incidentDot < 0 ) {
				lumFactor *= 1 + vals.shading.val * ( hits[j].incidentDot ** 2 );
				lumFactor = Math.min( lumFactor, 1.0 );
			}

			hits[j].material.lum *= Math.max( hits[j].material.emit, lumFactor );

			/*let hue = hits[j].dist / distCutoff;
			hue = Math.min( hue, 1.0 );
			hits[j].material.hue = hue * 360;*/


			if ( hits[j].shape.parent && hits[j].shape.parent.hovered ) {
				hits[j].material.lum *= 0.7;
				//if ( hits[j].material.lum < 0 ) hits[j].material.lum = 0;
			}

			let color = hits[j].material.getRGBA();

			if ( hits[j].shape && hits[j].shape.parent ) {
				color.a *= hits[j].shape.parent.getAlpha();
			}

			blended.r = color.r * color.a + blended.r * ( 1 - color.a );
			blended.g = color.g * color.a + blended.g * ( 1 - color.a );
			blended.b = color.b * color.a + blended.b * ( 1 - color.a );
 			//hits[j].material.blendWith( blended );
		}

		/* alter colors of hovered objects */

		output.push( blended );
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

	return output;
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