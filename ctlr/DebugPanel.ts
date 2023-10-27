import { create, clear } from '../lib/juego/domutil.js'

import * as Debug from '../Debug.js'
import { GameControllerDom } from '../GameControllerDom.js'
import { Dict } from '../lib/juego/util.js'

import { Panel } from './Panel.js'

export class DebugPanel extends Panel {
	constructor() {
		super( 'Debug' );
	}

	protected updateDom( c: GameControllerDom ) {
		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		// checkboxes
		for ( let option in Debug.flags ) {
			let optionName = option; // bring name into local scope

			let div = create( 'div', { innerHTML: optionName }, body );

			let checkbox = create( 'input', {}, div ) as HTMLInputElement;
			checkbox.className = 'check';
			checkbox.type = 'checkbox';

			checkbox.onchange = () => {
				let obj: Dict<boolean> = {};
				obj[optionName] = checkbox.checked;

				Debug.setFlags( obj );
			}

			document.addEventListener( 'var_' + optionName, ( e: Event ) => {
				if ( ( e as CustomEvent).detail ) {
					checkbox.checked = true;
				} else {
					checkbox.checked = false;
				}
			} );

			checkbox.checked = Debug.flags[optionName];
		}

		for ( let option in Debug.fields ) {
			let optionName = option;

			let div = create( 'div', { innerHTML: optionName }, body );

			let textbox = create( 'input', {}, div ) as HTMLInputElement;
			textbox.className = 'text';

			let obj: Dict<Debug.DebugField> = {};

			textbox.onchange = () => {
				obj[optionName] = { value: textbox.value };

				Debug.setFlags( obj );
			}

			document.addEventListener( 'var_' + optionName, ( e: Event ) => {
				let detail = ( e as CustomEvent ).detail as Debug.DebugField;

				if ( detail ) {
					textbox.value = detail.value;

					if ( detail.isValid ) {
						textbox.classList.remove( 'invalid' );
					} else {
						textbox.classList.add( 'invalid' );
					}
				} else {
					textbox.value = '';
				}
			} );

			obj[optionName] = Debug.fields[optionName];
			Debug.setFlags( obj );
		}
	}
}