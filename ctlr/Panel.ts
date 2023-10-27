import * as tp from '../lib/toastpoint.js'

import { create, clear } from '../lib/juego/domutil.js'
import { Entity } from '../lib/juego/Entity.js'

import { store } from '../store.js'
import { createCommandButton } from '../lib/juego/Menu.js'
import { Dict } from '../lib/juego/util.js'
import { Vec2 } from '../lib/juego/Vec2.js'

import * as Debug from '../Debug.js'
import { GameControllerDom } from '../GameControllerDom.js'

let _drag: Panel = null;
let _dragOffset: Vec2 = new Vec2();

document.addEventListener( 'mouseup', ( e: any ) => {
	if ( e.button == 2 ) return; // right click

	if ( _drag ) {
		_drag.dom.classList.remove( 'dragged' );
	}

	_drag = null;

	document.dispatchEvent( new CustomEvent( 'ui-hide-shields' ) );
} );

document.addEventListener( 'mousemove', ( e: any ) => {
	if ( _drag ) {//&& _drag.dom.classList.contains( 'detached' ) ) {
		_drag.dom.classList.add( 'detached' );

		document.body.appendChild( _drag.dom );

		_drag.dom.style.left = ( e.pageX - _dragOffset.x ) + '';
		_drag.dom.style.top = ( e.pageY - _dragOffset.y ) + '';
		_drag.dom.classList.add( 'detached' );
	}
} );

export function receivePanel( this: HTMLElement, target: HTMLElement, e: any ) {
	if ( !_drag ) return; 
	e.stopPropagation(); // don't trigger document.onmousemove

	target.appendChild( _drag.dom );

	_drag.dom.style.left = '';
	_drag.dom.style.top = '';
	_drag.dom.classList.remove( 'detached' );
}

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
			if ( this.dom.classList.contains( 'detached' ) ) return;

			let array = Array.from( panel.parentElement.children )

			let dragIndex = array.indexOf( _drag.dom );
			let thisIndex = array.indexOf( panel );

			if ( dragIndex < 0 || dragIndex > thisIndex ) {
				panel.parentElement.insertBefore( _drag.dom, panel );	
			} else {
				panel.parentElement.insertBefore( _drag.dom, panel.nextSibling );
			}

			_drag.dom.style.left = '';
			_drag.dom.style.top = '';
			_drag.dom.classList.remove( 'detached' );
		}

		let shield = create( 'div', {}, panel );
		shield.classList.add( 'query-panel-shield' );

		let header = create( 'div', {}, panel );
		header.classList.add( 'query-panel-header' );

		header.onmousedown = ( e: any ) => {
			if ( e.button == 2 ) return; // right click

			e.preventDefault(); // don't select header text

			_drag = this;
			_dragOffset = new Vec2( e.offsetX, e.offsetY );
		}

		panel.onmousemove = ( e: any ) => {
			e.stopPropagation(); // don't trigger document.onmousemove
			e.preventDefault(); // don't select header text

			if ( _drag == this ) {
				this.dom.classList.add( 'dragged' );	

				document.dispatchEvent( new CustomEvent( 'ui-show-shields', { detail: _drag } ) );

				if ( this.dom.classList.contains( 'detached' ) ) {
					this.dom.style.left = ( e.pageX - _dragOffset.x ) + '';
					this.dom.style.top = ( e.pageY - _dragOffset.y ) + '';
				}
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

		button.onmousemove = ( e: any ) => {
			e.stopPropagation();
		}

		return panel;
	}

	tryUpdate( c: GameControllerDom, newHash: string ) {
		if ( newHash != this.hash || this.lastUpdateTime == 0 ) {
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