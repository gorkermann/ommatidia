import { Dict } from './lib/juego/util.js'

export class Watcher {
	name: string;
	lastChangeTime: number = 0;

	constructor( name: string ) {
		this.name = name;
	}

	checkForChanges() {}
}

export class DictWatcher extends Watcher {
	keys: Array<string> = [];
	dict: Dict<any>;

	constructor( name: string, dict: Dict<any> ) {
		super( name );

		this.dict = dict;
	}

	checkForChanges() {
		let changed = false;
		let newKeys = Object.keys( this.dict );

		for ( let key of newKeys ) {
			if ( !this.keys.includes( key ) ) {
				changed = true;
				break;
			}
		}

		for ( let key of this.keys ) {
			if ( !this.keys.includes( key ) ) {
				changed = true;
				break;
			}
		}

		this.keys = Object.keys( this.dict );

		if ( changed ) {
			this.lastChangeTime = new Date().getTime();
		}
	}
}