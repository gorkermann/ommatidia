import ws281x from 'rpi-ws281x-native'

import { Angle, Angle_HalfTurn } from './lib/juego/Angle.js'
import { Entity } from './lib/juego/Entity.js'
import { Vec2 } from './lib/juego/Vec2.js'
import { Line } from './lib/juego/Line.js'
import { RGBA, Material, RGBAtoFillStyle } from './lib/juego/Material.js'
import { RayHit, closestTo } from "./lib/juego/RayHit.js"
import { Shape, ShapeHit } from './lib/juego/Shape.js'
import { vals } from './SliderVal.js'

import { COL, MILLIS_PER_FRAME } from './collisionGroup.js'
import * as Debug from './Debug.js'

import { XhrInterface } from './NodeServer.js'

let channel: any;

if ( typeof document === 'undefined' ) {
	channel = ws281x(143, { stripType: 'ws2812', gpio: 10 } );
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

export function shapecast( sliceInfo: SliceInfo, line: Line, shapes: Array<Shape>, minSweep: Array<number>=null, maxSweep: Array<number>=null ) {//: Array<ShapeHit> {
	//let closestRayHits: Array<ShapeHit> = [];
	let v = line.p2.minus( line.p1 );
	let angle = v.angle();

	let hit: ShapeHit;

	//sliceInfo.hits = [];

	for ( let i = 0; i < shapes.length; i++ ) {
		let shape = shapes[i];

		if ( !shape.material ) continue;
		if ( minSweep && maxSweep && !Angle.between( angle, minSweep[i], maxSweep[i] ) ) continue;
		if ( shape.material.alpha == 0.0 ) continue;

		// let hits = shape.rayIntersect( line );

		// for ( let i = 0; i < hits.length; i++ ) {
		// 	if ( hits[i].material.alpha == 0.0 ) continue;

		// 	//hits[i].vel = shape.getVel( hits[i].point ); // EDIT don't need if not doing approach flash
		// 	hits[i].shape = shape;
		// 	hits[i].incidentDot = -1;//line.p2.minus( line.p1 ).unit().dot( hits[i].normal ); // EDIT don't need if not doing corner highlight

		// 	// inside shape
		// 	if ( hits[i].incidentDot > 0 ) {
		// 		hits[i].incidentDot *= -1;
		// 		hits[i].normal.flip();
		// 	}

		// 	hits[i].normalDist = -hits[i].incidentDot * hits[i].dist;

		// 	sliceInfo.hits.push( hits[i] );

		// 	if ( hits[i].material.alpha == 1.0 ) break;
		// }



		hit = sliceInfo.hits[0];
		if ( shape.rayIntersectSingle( line, hit ) ) {
			//hit.vel = shape.getVel( hit.point ); // EDIT don't need if not doing approach flash
			hit.shape = shape;
			hit.incidentDot = line.p2.minus( line.p1 ).unit().dot( hit.normal ); // EDIT don't need if not doing corner highlight

			// inside shape
			if ( hit.incidentDot > 0 ) {
				hit.incidentDot *= -1;
				hit.normal.flip();
			}

			hit.normalDist = -hit.incidentDot * hit.dist;

			//closestRayHits.push( hit );
		}
	}

	// sliceInfo.hits.sort( ( a: ShapeHit, b: ShapeHit ) => a.dist - b.dist );

	// if ( sliceInfo.hits.length == 0 ) {
	// 	sliceInfo.hits.push( new ShapeHit( new Vec2(), new Vec2(), new Material( 0, 0, 0.5 ) ) );
	// 	sliceInfo.hits[0].dist = -1;
	// }
}

let getHitsOutput: Array<SliceInfo> = [];
let minmax: [Angle_HalfTurn, Angle_HalfTurn] = [0, 0];

let cosTable: Array<number> = [];
let sinTable: Array<number> = [];

function getHits( shapes: Array<Shape>,
				  origin: Vec2,
				  slices: Array<number> ): Array<SliceInfo> {
	//let output: Array<SliceInfo> = [];

	if ( cosTable.length != slices.length ) {
		cosTable = [];
		sinTable = [];

		let angle: number = 0;

		for ( let i = 0; i < slices.length; i++ ) {
			angle += slices[i] / 2;

			cosTable[i] = Math.cos( angle );
			sinTable[i] = Math.sin( angle );

			angle += slices[i] / 2;
		}
	}

	while ( getHitsOutput.length < slices.length ) {
		getHitsOutput.push( new SliceInfo( 0, 0, [new ShapeHit( new Vec2(), new Vec2(), new Material( 0, 0, 0.5 ) )] ) );
	}

	if ( getHitsOutput.length > slices.length ) {
		getHitsOutput = getHitsOutput.slice( 0, slices.length );
	}

	let angle = 0;

	let minSweep: Array<number> = [];
	let maxSweep: Array<number> = [];

	let line = new Line( 0, 0, 0, 0 );

	for ( let shape of shapes ) {
		Angle.getSweep( shape.points, origin, minmax );

		minSweep.push( minmax[0] );
		maxSweep.push( minmax[1] );
	}

	pushMark( '_sw' );

	let slice: number;

	for ( let i = 0; i < slices.length; i++ ) {
		slice = slices[i];

		angle += slice / 2;

		line.p1.set( origin );
		line.p2.x = origin.x + cosTable[i] * 1000;
		line.p2.y = origin.y + sinTable[i] * 1000;

		getHitsOutput[i].angle = angle;
		getHitsOutput[i].slice = slice;
		getHitsOutput[i].hits[0].dist = -1;
		shapecast( getHitsOutput[i], line, shapes, minSweep, maxSweep );

		angle += slice / 2;
	}

	return getHitsOutput;
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

let sliceCount = 143;
let theta = Math.PI * 2 / sliceCount;
let cosSl = Math.cos( theta );
let sinSl = Math.sin( theta );

function highlightCorners( hit: ShapeHit, prevHit: ShapeHit, nextHit: ShapeHit, ) {
	let score = 0.0; // higher is more corner

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

	score *= 1 - Math.min( 1.0, hit.dist / vals.cornerCutoff.val );

	hit.cornerScore = score;

	// old way
	//hit.material.highlightCorners( score );

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

let rollingAvgDist = 0;
let rollingFactor = 0.01;

function updateRollingAvgDist( sliceInfos: Array<SliceInfo> ) {
	let maxDist = -1;

	for ( let i = 0; i < sliceInfos.length; i++ ) {
		if ( !sliceInfos[i] ) continue;

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

type Mark = {
	name: string;
	timestamp: number;
}

let start = 0;
let marks: Array<Mark> = [];

function pushMark( name: string ) {
	marks.push( { name: name, timestamp: new Date().getTime() } );
}

export function renderFromEye( context: CanvasRenderingContext2D, 
							   shapes: Array<Shape>,
							   origin: Vec2,
							   vel: Vec2,
							   sliceCount: number,
							   or: number, ir: number,
							   overlay?: Array<RGBA> ) {

	/* get frame data */

	marks = [];
	pushMark( 'start' );

	let slices = getSlices( sliceCount );

	pushMark( 'slices' );

	let blendedSegments = getFrame( shapes, origin, vel, slices ); // RGBA array, 0 to 1
	if ( blendedSegments.length != sliceCount ) {
		console.error( 'render.renderFromEye(): Slice count mismatch: ' + blendedSegments.length + ' != ' + sliceCount );
		return;
	}

	/* blend in overlay */

	if ( overlay ) {
		for ( let i = 0; i < overlay.length && i < sliceCount; i++ ) {
			if ( !( i in overlay ) ) continue;
			if ( overlay[i].a == 0 ) continue;

			blendedSegments[i].r = overlay[i].r * overlay[i].a + blendedSegments[i].r * ( 1 - overlay[i].a );
			blendedSegments[i].g = overlay[i].g * overlay[i].a + blendedSegments[i].g * ( 1 - overlay[i].a );
			blendedSegments[i].b = overlay[i].b * overlay[i].a + blendedSegments[i].b * ( 1 - overlay[i].a );
		}
	}

	pushMark( 'frame' );

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

	pushMark( 'segs' );

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
	}

	pushMark( 'end' );

	let str = '';
	for ( let i = 1; i < marks.length; i++ ) {
		str += marks[i].name + ':' + ( marks[i].timestamp - marks[i-1].timestamp ) + ', ';
	}
	console.log( str );
}

let buffer: Array<RGBA> = [];

function getFrame( shapes: Array<Shape>,
				   origin: Vec2,
				   vel: Vec2,
				   slices: Array<number> ): Array<RGBA> {
	let sliceInfos = getHits( shapes, origin, slices );

	pushMark( 'hits' );

	if ( Debug.flags.AUTO_BRIGHT_ADJUST ) {
		updateRollingAvgDist( sliceInfos );
	}

	/* adjust buffer allocation to match slice count */

	while ( buffer.length < sliceInfos.length ) {
		buffer.push( { r: 0, g: 0, b: 0, a: 0 } );
	}

	if ( buffer.length > sliceInfos.length ) {
		buffer = buffer.slice( 0, sliceInfos.length );
	}

	/* update buffer */

	let blended: RGBA;
	let lumFactor, satFactor: number;

	for ( let i = 0; i < sliceInfos.length; i++ ) {
		if ( !sliceInfos[i] || sliceInfos[i].hits.length == 0 || sliceInfos[i].hits[0].dist < 0 ) {
			buffer[i].r = 0;
			buffer[i].g = 0;
			buffer[i].b = 0;
			buffer[i].a = 0;
			continue;
		}

		if ( Debug.flags.NO_COLOR_ADJUSTMENT ) {
			let color = sliceInfos[i].hits[0].material.getRGBA();

			buffer[i].r = color.r;
			buffer[i].g = color.g;
			buffer[i].b = color.b;
			buffer[i].a = color.a;
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

		let distCutoff = vals.lumCutoff.val;
		if ( Debug.flags.AUTO_BRIGHT_ADJUST ) distCutoff = rollingAvgDist;

		for ( let j = opaqueIndex; j >= 0; j-- ) {
			
			//satFactor = Math.min( vals.satCutoff.val / ( hits[j].dist ** vals.satPower.val ), 1.0 );
			satFactor = Math.min( ( vals.satCutoff.val - hits[j].dist ) / ( vals.satCutoff.val - 10 ), 1.0 );
			satFactor = Math.max( satFactor, vals.satMin.val );

			//lumFactor = Math.min( vals.lumCutoff.val / ( hits[j].dist ** vals.lumPower.val ), 1.0 );
			lumFactor = Math.min( ( distCutoff - hits[j].dist ) / ( distCutoff - 10 ), 1.0 );
			lumFactor = Math.max( lumFactor, vals.lumMin.val );

			// specular highlight
			if ( hits[j].incidentDot < 0 ) {
				lumFactor *= 1 + vals.shading.val * ( hits[j].incidentDot ** 2 );
				lumFactor = Math.min( lumFactor, 1.0 );
			}

			// apply emit parameter for bright objects
			satFactor = Math.max( hits[j].material.emit, satFactor ) 
			lumFactor = Math.max( hits[j].material.emit, lumFactor );

			/* */

			hits[j].material.sat *= satFactor;
			hits[j].material.lum *= lumFactor;

			/* thermal camera view */
			if ( Debug.flags.THERMAL_CAMERA ) {
				let hue = hits[j].dist / distCutoff;
				hue = Math.min( hue, 1.0 );
				hits[j].material.hue = hue * 240; // closest is red, farthest is blue
			}

			/* angle view */  
			let distFac: number = 0;
			let useRanging = false;
			if ( hits[j].shape.parent ) {
				let group = hits[j].shape.parent.collisionGroup;
				if ( group == COL.USE_ROOT ) {
					group = hits[j].shape.parent.getRoot().collisionGroup;
				}

				if ( group == COL.LEVEL ) {
					useRanging = Debug.flags.RANGING_VIEW;
				}
			}

			if ( useRanging ) {
				distFac = hits[j].dist / ( distCutoff / 2 ); // hue descends faster than luminance
				distFac = Math.min( distFac, 1.0 );

				let angle = hits[j].normal.angle();
				let angFac = Math.abs( Math.sin( angle ) );

				hits[j].material.hue = 90 + angFac * 60; // horiz is cyan, vert is yellow

				hits[j].material.lum *= 1 - hits[j].cornerScore * vals.cornerFactor.val;
				hits[j].material.lum = Math.max( 0.5 * vals.lumMin.val, hits[j].material.lum ); // 0.5 being normal luminance (maybe save this above?)
			}

			// highlight hovered entities
			if ( hits[j].shape.parent && hits[j].shape.parent.hovered ) {
				hits[j].material.lum *= 0.7;
			}

			let color = hits[j].material.getRGBA();

			if ( hits[j].shape && hits[j].shape.parent ) {
				color.a *= hits[j].shape.parent.getAlpha();
			}

			if ( useRanging ) {
				color.g *= ( 1 - distFac );
			}

			blended.r = color.r * color.a + blended.r * ( 1 - color.a );
			blended.g = color.g * color.a + blended.g * ( 1 - color.a );
			blended.b = color.b * color.a + blended.b * ( 1 - color.a );
 			//hits[j].material.blendWith( blended );
		}

		buffer[i].r = blended.r;
		buffer[i].g = blended.g;
		buffer[i].b = blended.b;
		buffer[i].a = 1.0;
	}

	return buffer;
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