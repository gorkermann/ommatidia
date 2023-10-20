import * as tp from './lib/toastpoint.js'

import { constructors, nameMap } from './lib/juego/constructors.js'
import { create, clear } from './lib/juego/domutil.js'
import { Entity } from './lib/juego/Entity.js'
import { store } from './store.js'
import { createCommandButton } from './lib/juego/Menu.js'
import { Dict } from './lib/juego/util.js'

import * as Debug from './Debug.js'
import { GameControllerDom } from './GameControllerDom.js'

let _drag: Panel = null;

document.addEventListener( 'mouseup', () => {
	if ( _drag ) {
		_drag.dom.classList.remove( 'dragged' );
	}

	_drag = null;
} );

export class Panel {
	hash: string = '';
	updateOn: Array<string> = [];
	lastUpdateTime: number = 0;

	dom: HTMLDivElement;

	constructor( name: string ) {
		this.dom = this.createEmptyPanel( name );
	}

	getHash(): string {
		return ''
	}

	private createEmptyPanel( name: string ): HTMLDivElement {
		let panel = create( 'div' ) as HTMLDivElement;
		panel.classList.add( 'query-panel' );

		panel.onmouseenter = () => {
			if ( !_drag || _drag == this ) return; 

			let array = Array.from( panel.parentElement.children )

			let dragIndex = array.indexOf( _drag.dom );
			let thisIndex = array.indexOf( panel );

			if ( dragIndex > thisIndex ) {
				panel.parentElement.insertBefore( _drag.dom, panel );	
			} else {
				panel.parentElement.insertBefore( _drag.dom, panel.nextSibling );
			}
		}

		let header = create( 'div', {}, panel );
		header.classList.add( 'query-panel-header' );

		header.onmousedown = ( e: any ) => {
			e.preventDefault();

			_drag = this;
		}

		header.onmousemove = ( e: any ) => {
			e.preventDefault();

			if ( _drag == this ) {
				this.dom.classList.add( 'dragged' );	
			}
		}

		let title = create( 'div', { innerHTML: name }, header );
		title.classList.add( 'query-panel-title' );

		let button = create( 'button', { innerHTML: '\u25BC' }, header );
		button.classList.add( 'hide-show-button' );

		let body = create( 'div', {}, panel );
		body.classList.add( 'query-panel-body' );

		button.onclick = () => {
			if ( body.style.display == 'none' ) {
				body.style.display = '';
				button.innerHTML = '\u25BC';
			} else {
				body.style.display = 'none'
				button.innerHTML = '\u25C0';
			}
		}

		return panel;
	}

	tryUpdate( c: GameControllerDom, newHash: string ) {
		if ( newHash != this.hash ) {
			this.updateDom( c );

			this.lastUpdateTime = new Date().getTime();
		}

		this.hash = newHash;
	}

	protected updateDom( c: GameControllerDom ) {}

	save( c: GameControllerDom ) {}

	restore( c: GameControllerDom ) {}

	drawHelpers( context: CanvasRenderingContext2D ) {}
}

export class SaverPanel extends Panel {
	/* property overrides */

	updateOn = ['localStorage'];

	constructor() {
		super( 'File Manager');
	}

	protected updateDom( c: GameControllerDom ) {
		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		for ( let key of Object.keys( store ) ) {
			let link = create( 'div', {}, body ) as HTMLDivElement;
			link.innerHTML = key;

			link.classList.add( 'file-link' );
		
			link.onmousedown = () => {
				c.runCommand( 'Load File', { filename: key } );
			}
		}

		let saveAsName = create( 'input', {}, body ) as HTMLInputElement;
		let button = createCommandButton( 'Save', 'Save File', [], () => { return { filename: saveAsName.value } } );
		body.appendChild( button );

		if ( Debug.flags.LOG_PANEL_UPDATES ) {
			console.log( 'Updated panel fileList' );
		}
	}
}

export class PrefabPanel extends Panel {
	/* property overrides */

	updateOn = ['localStorage'];

	constructor() {
		super( 'Prefabs' );
	}

	protected updateDom( c: GameControllerDom ) {
		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		let prefabKeys = Object.keys( store ).filter( x => x.indexOf( 'prefab-' ) == 0 );

		for ( let key of prefabKeys ) {
			let link = create( 'div', {}, body ) as HTMLDivElement;
			link.innerHTML = key;

			link.classList.add( 'object-link' );
			link.classList.add( 'nonempty' );
		
			link.onmousedown = () => {
				let json = JSON.parse( store[key] );
				let toaster = new tp.Toaster( constructors, nameMap );
				let prefab = tp.fromJSON( json, toaster ) as Entity;
				prefab.parent = null;

				tp.resolveList( [prefab], toaster );

				c.runCommand( 'Place Entity', { target: prefab } );
			}
		}

		let saveButton = createCommandButton( 'Save', 'Save As Prefab' );
		body.appendChild( saveButton );

		if ( Debug.flags.LOG_PANEL_UPDATES ) {
			console.log( 'Updated panel prefabList' );
		}
	}
}

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