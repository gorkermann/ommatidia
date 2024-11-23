import { Dict } from './lib/juego/util.js'

let DEFAULT_ENV: Dict<string> = {
	JUMP_KEY: 'Z',
	TRANSPONDER_KEY: 'X' 
}

let CABINET_ENV: Dict<string> = {
	JUMP_KEY: 'A',
	TRANSPONDER_KEY: 'B',
}

let env: Dict<string> = DEFAULT_ENV;

if ( typeof document === 'undefined' ) {
	env = CABINET_ENV;
}

export default env;