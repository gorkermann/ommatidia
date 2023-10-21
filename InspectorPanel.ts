import md5 from 'md5'

import { Dropdown } from './lib/juego/Dropdown.js'
import { Editable, Range } from './lib/juego/Editable.js'
import { create, clear } from './lib/juego/domutil.js'
import { Dict, unorderedArraysMatch, fancyType } from './lib/juego/util.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { AnimPanel } from './lib/juego/panel/AnimPanel.js'
import { Field, InputField, Vec2Field, DropField, ObjectField, ArrayField,
		 getDisplayVarname, TypeMismatchError } from './lib/juego/panel/Field.js'

import * as Debug from './Debug.js'
import { GameControllerDom } from './GameControllerDom.js'
import { Panel } from './Panel.js'

function getDefaultEditFields( obj: any ): Array<string> {
	return Object.keys( obj ).filter( x => x[0] != '_' );
}

export class InspectorPanel extends Panel {
	private _targets: Array<Editable> = [];
	private _fields: Array<Field> = [];

	private _savedIds: Array<number> = [];

	/* property overrides */

	updateOn = ['self'];

	constructor() {
		super( 'Inspector' );

		// unhover entities hovered from object links
		this.dom.addEventListener( 'mousemove', () => {
			document.dispatchEvent( new CustomEvent( 'dom-hover', { detail: null } ) );
		} );
	}

	private static getTitle( targets: Array<Editable> ) {
		let ids: Dict<Array<number>> = {};

		for ( let obj of targets ) {
			let type = fancyType( obj );

			if ( !( ids[type] ) ) ids[type] = [];

			ids[type].push( obj.id );
		}

		let output = '';

		for ( let key in ids ) {
			output += key + ' ' + ids[key].join( ',' ) + ' ';
		}

		return output;
	}

	/* method overrides */

	getHash(): string { 
		return md5( this._targets.map( x => x.id ).join( ',' ) );
	}

	tryUpdate( c: GameControllerDom, newHash: string ) {
		super.tryUpdate( c, newHash );

		this.updateFields();
	}

	protected updateDom( c: GameControllerDom ) {
		this._fields = [];

		let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;
		clear( body );

		if ( this._targets.length == 0 ) return

		// subtitle
		let subtitle = create( 'div', {}, body ) as HTMLDivElement;
		subtitle.className = 'query-panel-title';
		subtitle.innerHTML = InspectorPanel.getTitle( this._targets );

		// add a checkbox to pin this panel
		let pinBox = create( 'input', { type: 'checkbox' }, subtitle ) as HTMLInputElement;
		pinBox.className = 'pin-box';

		pinBox.onchange = () => {
			if ( pinBox.checked ) {
				this.dom.classList.add( 'pinned' );
			} else {
				this.dom.classList.remove( 'pinned' );
			}
		}

		// find shared object fields, add them to inspector
		let commonFields = this._targets[0].editFields;
		if ( !commonFields ) commonFields = getDefaultEditFields( this._targets[0] );

		for ( let obj of this._targets ) {
			let fields = obj.editFields;
			if ( !fields ) fields = getDefaultEditFields( obj );

			commonFields = commonFields.filter( x => fields.includes( x ) );
		}

		for ( let varname of commonFields ) {
			this.addField( this._targets, varname, true );
		}

		// if showing a single object, add display-only fields
		if ( this._targets.length == 1 && this._targets[0].showFields ) {
			for ( let varname in this._targets[0].showFields ) {
				this.addField( this._targets, varname, false );
			}
		}

		this.updateFields();
	}

	save( c: GameControllerDom ) {
		this._savedIds = this._targets.map( x => x.id );
	}

	restore ( c: GameControllerDom ) {
		if ( c.currentScene ) {
			let targets = [];

			for ( let id of this._savedIds ) {
				if ( id in c.currentScene.em.entitiesById ) {
					targets.push( c.currentScene.em.entitiesById[id] );
				}
			}

			this._targets = targets;
		}

		this._savedIds = [];
	}

	drawHelpers( context: CanvasRenderingContext2D ) {
		for ( let field of this._fields ) {
			for ( let helper of field.helperEntities ) {
				helper.draw( context );
			}
		}
	}

	/* fields */

	inspect( targets: Array<Editable> ) {
		if ( !this.dom.classList.contains( 'pinned' ) ) {
			this._targets = targets;
		}
	}

	updateFields() {
		let anyEdited = false;

		for ( let field of this._fields ) {
			if ( field.updateControl() ) {
				anyEdited = true;
			}
		}

		if ( this.dom ) {
			let subPanels = this.dom.getElementsByClassName( 'sub-panel' );

			for ( let elem of subPanels as HTMLCollectionOf<HTMLElement> ) {
				elem.dispatchEvent( new Event( 'update' ) );
			}
		}

		if ( anyEdited ) {
			document.dispatchEvent( new CustomEvent( 'editField' ) );
		}
	}

	private addField( objs: Array<Editable>, varname: string, edit: boolean=false ) {
		if ( objs.length < 1 ) {
			return;
		}

		if ( !edit && !Debug.flags.SHOW_DISABLED_FIELDS ) return;

		try {
			let body = this.dom.getElementsByClassName( 'query-panel-body' )[0] as HTMLDivElement;

			// create container and label
			let div = create( 'div', {}, body) as HTMLDivElement;
			let span = create( 'span', { innerHTML: getDisplayVarname( varname ) + ': ' }, div ) as HTMLSpanElement;

			// create input field
			let type: string = fancyType( ( objs[0] as any )[varname] );

			let range: Range;
			if ( 'ranges' in objs[0] ) range = objs[0].ranges[varname];

			if ( range && range instanceof Array ) {
				let drop = new Dropdown();

				drop.dom.disabled = !edit;
					
				this._fields.push( new DropField( objs, varname, type, drop ) );
				
				div.appendChild( drop.dom );

			} else if ( type == 'number' || type == 'string' || type == 'boolean' ) {
				let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;

				// style input element
				if ( type == 'number' || type == 'string' ) {
					input.className = 'panel-input';

				} else if ( type == 'boolean' ) {
					input.className = 'check';
					input.type = 'checkbox';
				}
					
				this._fields.push( new InputField( objs, varname, type, input ) );
			
				div.appendChild( input );

			} else if ( type == 'Vec2' ) {
				let input = create( 'input', { disabled: !edit } ) as HTMLInputElement;
				input.className = 'panel-input';

				this._fields.push( new Vec2Field( objs, varname, type, input ) );
			
				div.appendChild( input );

			} else if ( type == 'Array' ) {
				let linkDiv = create( 'div' ) as HTMLDivElement;

				this._fields.push( new ArrayField( objs, varname, type, linkDiv ) );

				div.appendChild( linkDiv );

			} else if ( type == 'Anim' && objs.length == 1 ) {
				let animDiv = create( 'div' ) as HTMLDivElement;

				this._fields.push( new AnimPanel( objs[0], varname, type, animDiv ) );

				div.appendChild( animDiv );

			} else {
				let linkDiv = create( 'div' ) as HTMLDivElement;

				this._fields.push( new ObjectField( objs, varname, type, linkDiv ) );

				div.appendChild( linkDiv );
			}

			body.appendChild( div );

		} catch ( ex: any ) {
			if ( ex instanceof TypeMismatchError ) {
				// do nothing, don't append field to body 
			} else {
				throw ex;
			}
		}
	}
}