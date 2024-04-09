import { Camera } from './lib/juego/Camera.js'
import { CommandRef, MOD } from './lib/juego/CommandRef.js'
import { Controller } from './lib/juego/Controller.js'
import { Editable } from './lib/juego/Editable.js'
import { Entity } from './lib/juego/Entity.js'
import { Keyboard, KeyCode } from './lib/juego/keyboard.js'
import { constructors, nameMap } from './lib/juego/constructors.js'
import { Scene } from './Scene.js'
import { Selector } from './lib/juego/Selector.js'
import { Dict } from './lib/juego/util.js'
import { Vec2 } from './lib/juego/Vec2.js'

import * as tp from './lib/toastpoint.js'
 
import { PlayMode } from './mode/PlayMode.js'

import { Panel, receivePanel } from './ctlr/Panel.js'
import { InspectorPanel } from './ctlr/InspectorPanel.js'
import { SaverPanel } from './ctlr/SaverPanel.js'
import { PrefabPanel } from './ctlr/PrefabPanel.js'
import { DebugPanel } from './ctlr/DebugPanel.js'
import { EntityPanel } from './ctlr/EntityPanel.js'
import { CommandPanel } from './ctlr/CommandPanel.js'

import * as Debug from './Debug.js'
import { gameCommands } from './gameCommands.js'
import { GameController } from './GameController.js'
import { FloaterScene } from './FloaterScene.js'
import { Level } from './Level.js'
import { store } from './store.js'
import { TitleScene } from './TitleScene.js'
import { Watcher, DictWatcher } from './Watcher.js'

tp.config.WRITE_PTR_CLASSNAME = true;

class FadingImage {
	image: HTMLImageElement;
	fade: number = 1.0;

	constructor( image: HTMLImageElement ) {
		this.image = image;
	}
}

let oldImages: Array<FadingImage> = [];

type LoadLevelOptions = {
	forceEraseHistory?: boolean
}

let domHoverlist: Array<Entity> = [];

type ResetInterfaceOptions = {
	soft?: boolean;
}

export class GameControllerDom extends GameController {
	context: CanvasRenderingContext2D = null;

	watchers: Dict<Watcher> = {
		'localStorage': new DictWatcher( 'localStorage', store )
	};

	inspector: InspectorPanel;
	panels: Array<Panel> = [];

	floaterScene: FloaterScene;

	constructor() {
		super();

		this.initCanvas();
		this.initKeyboard();
		this.initMouse();
		this.initMenu();

		this.changeMode( new PlayMode() );

		let rightPane = document.getElementsByClassName( 'rightpane' )[0] as HTMLDivElement;
		let container = document.getElementById( 'rightPanelContainer' );

		rightPane.onmousemove = receivePanel.bind( rightPane, container );

		let debug = new DebugPanel();
		this.addPanel( debug, container );

		this.addPanel( new SaverPanel(), container );
		this.addPanel( new PrefabPanel(), container );
		this.addPanel( new CommandPanel(), container );
		this.addPanel( new EntityPanel(), container );

		this.inspector = new InspectorPanel();
		this.addPanel( this.inspector, container );

		this.addMessageHandler( 'complete', () => { 
			this.levelIndex += 1;
			//this.levelIndex = 0;

			if ( this.levelIndex < this.levelDataList.length && this.playerStatus.defeatedNames.length < 6 ) {
				this.startLevel();

			} else {
				oldImages = [];

				this.loadScene( this.title );
			}
		} );

		document.addEventListener( 'ui-show-shields', ( e: any ) => { 
			for ( let panel of this.panels ) {
				let shield = panel.dom.getElementsByClassName( 'query-panel-shield' )[0] as HTMLDivElement;

				if ( !shield ) continue;

				shield.classList.add( 'show' );
			}
		} );

		document.addEventListener( 'ui-hide-shields', ( e: any ) => { 
			for ( let panel of this.panels ) {
				let shield = panel.dom.getElementsByClassName( 'query-panel-shield' )[0] as HTMLDivElement;

				if ( !shield ) continue;

				shield.classList.remove( 'show' );
			}
		} );
	}

	addPanel( panel: Panel, container: HTMLElement ) {
		container.appendChild( panel.dom );
		this.panels.push( panel );
	}

	initCanvas() {
		this.canvas = document.getElementById( 'canvas' ) as HTMLCanvasElement;
		this.resize();

		this.floaterScene = new FloaterScene( this.canvas );
		this.floaterScene.camera.setViewport( this.canvas.width, this.canvas.height );

		this.title.floaters = this.floaterScene.floaters;

		window.addEventListener( 'resize', ( e ) => {
			this.resize();
		} );
	}

	initMenu() {
		this.commandList = this.commandList.concat( gameCommands );

		// command events
		document.addEventListener( 'runCommand', ( e: any ) => {
			if ( !e.detail ) {
				console.error( 'runCommand handler: no detail provided' );
				return;
			}

			if ( !e.detail.commandName ) {
				console.error( 'runCommand handler: no name provided' );
				return;
			}

			if ( e.detail.selection &&
				 e.detail.selection instanceof Array ) {
				this.sel.selection = e.detail.selection;
			}

			this.runCommand( e.detail.commandName, e.detail.options );
		} );
	}

	/* load */

	resetInterface( options: ResetInterfaceOptions={} ) {
		let selectedIds = this.sel.selection.map( x => x.id );
		for ( let panel of this.panels ) {
			panel.save( this );
		}

		this.sel = new Selector( [] );
		this.sel.availablePrims = this.currentScene.em.entities;

		// reapply selection and restore panels
		if ( this.currentScene instanceof Level ) {
			for ( let id of selectedIds ) {
				if ( id in this.currentScene.em.entitiesById ) {
					this.sel.doSelect( { sticky: true }, this.currentScene.em.entitiesById[id] );
				}
			}

			if ( Debug.flags.LOG_PANEL_UPDATES ) {
				console.log( 'reselected ids: ' + selectedIds );
			}

			for ( let panel of this.panels ) {
				panel.restore( this );
			}
		}

 		// reset saved frames
 		if ( options.soft ) {
 			this.recentStates = this.recentStates.slice( 0, 1 );

 			if ( this.currentScene instanceof Level ) {
 				this.lastStateTime = this.currentScene.elapsedTotal;	
 			} else {
 				this.lastStateTime = 0;
 			}
			
 		} else {
 			this.recentStates = [];
			this.lastStateTime = 0;
		}
	}

	startLevel() {
		if ( this.currentScene ) {
			let context = this.canvas.getContext( '2d' );

			context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
			this.currentScene.draw( context, { noConsole: true } );

			var image = new Image();
			image.src = this.canvas.toDataURL();

			oldImages.push( new FadingImage( image ) );
		}
	
		super.startLevel();
	}

	loadScene( scene: Scene, doLoad: boolean=true ) {
		super.loadScene( scene, doLoad );
		
		this.resize();
	}

	/* play */

	update() {
		super.update();

		this.mouse.update( this.canvas );

		for ( let key in this.watchers ) {
			this.watchers[key].checkForChanges();
		}

		for ( let panel of this.panels ) {
			let newHash = '';

			for ( let key of panel.updateOn ) {
				if ( key == 'self' ) {
					newHash = panel.getHash();

				} else {
					if ( key in this.watchers ) {
						if ( panel.lastUpdateTime < this.watchers[key].lastChangeTime ) {
							newHash = this.watchers[key].lastChangeTime + '';
							break;
						}
					}
				}
			}

			panel.tryUpdate( this, newHash );
		}
	}

	resize() {
		let drawarea = document.getElementById( 'drawarea' );

		let h = drawarea.getBoundingClientRect().height;
		this.canvas.height = h;

		if ( h > 400 ) {
			this.canvas.height = h;
		} else {
			this.canvas.height = 400;
		}

		this.canvas.width = this.canvas.height;

		if ( this.currentScene ) {
			this.currentScene.camera.setViewport( this.canvas.width, this.canvas.height );
		}
	}

	inspect( targets: Array<Editable> ) {
		this.inspector.inspect( targets );

		let dir: Vec2;

		if ( !Debug.flags.DRAW_NORMAL ) {
			let pos = this.mouse.pos.minus( new Vec2( this.camera.viewportW / 2, this.camera.viewportH / 2 ) );

			dir = pos.unit().scale( 1000 );
		}

		if ( this.currentScene ) this.currentScene.describe( targets[0] as Entity, dir );
	}

	updateHovered() {
		this.sel.clearHovered();

		if ( Debug.flags.DRAW_NORMAL ) {
			this.sel.updateHovered( this.cursor );

		} else {
			if ( this.currentScene instanceof Level && Debug.flags.MOUSE_SELECT ) {
				let pos = this.mouse.pos.minus( new Vec2( this.camera.viewportW / 2, this.camera.viewportH / 2 ) );

				let dir = pos.unit().scale( 1000 );

				this.sel.hoverlist.add( this.currentScene.pickFromEye( dir ) );
			}
		}
	}

	drawOldImage( context: CanvasRenderingContext2D ) {
		context.save();
			context.translate( this.canvas.width / 2, this.canvas.height / 2 );
			for ( let data of oldImages ) {
				context.globalAlpha = data.fade;
				context.scale( 0.8 + data.fade * 0.2, 0.8 + data.fade * 0.2 );

				context.drawImage( data.image, -data.image.width / 2, -data.image.height / 2 );

				data.fade -= 0.1;
			}

			for ( let i = oldImages.length - 1; i >= 0; i-- ) {
				if ( oldImages[i].fade <= 0 ) {
					oldImages.splice( i, 1 );
				}
			}

			context.globalAlpha = 1.0;
		context.restore();
	}

	draw( context?: CanvasRenderingContext2D ) {
		if ( !context ) {
			context = this.canvas.getContext( '2d' );
		}

		context.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		// background
		if ( this.currentScene == this.title ) {

			context.save();
				context.translate( -this.title.origin.x, -this.title.origin.y );
				this.floaterScene.draw( context );
			context.restore();
		}

		this.currentScene.draw( context );

		this.currentScene.camera.moveContext( context );
			this.mode.draw( this, context );

			for ( let panel of this.panels ) {
				panel.drawHelpers( context );
			}
		this.currentScene.camera.unMoveContext( context );

		this.drawOldImage( context );
	}
}