import { Dict } from './lib/juego/util.js'

type SliderVal = {
	id: string,
	val: number;
	default: number;
}

export let vals: Dict<SliderVal> = {
	satFactor: {
		id: 'sat-cutoff',
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
	lumCutoff: {			// distance over which luminance factor descends to the minimum
		id: 'lum-cutoff',
		val: 500,
		default: 500,
	},
	lumPower: {
		id: 'lum-power',
		val: 1.0,
		default: 1.0,
	},
	lumMin: {				// minimum luminance factor for any occupied slice
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

	cornerCutoff: {
		id: 'corner-cutoff',
		val: 50,
		default: 50
	},
	cornerFactor: {
		id: 'corner-factor',
		val: 0.5,
		default: 0.5
	}
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