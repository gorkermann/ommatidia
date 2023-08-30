import { GridArea } from "./lib/juego/GridArea.js"
import { AnimatedImage } from "./lib/juego/image.js"
import { Entity } from "./lib/juego/Entity.js"
import { EntityManager } from "./lib/juego/EntityManager.js"
import { Keyboard, KeyCode } from "./lib/juego/keyboard.js"
import { Line } from "./lib/juego/Line.js"
import { Region } from "./lib/juego/Region.js"
import { RayHit } from "./lib/juego/RayHit.js"
import { Scene } from "./lib/juego/Scene.js"
import { ScrollBox } from "./lib/juego/ScrollBox.js"
import { Shape } from "./lib/juego/Shape.js"
import { TileArray } from "./lib/juego/TileArray.js"
import { Vec2 } from "./lib/juego/Vec2.js"

import { Player } from "./Player.js"
import { Coin } from "./Coin.js"

import * as Debug from './Debug.js'

class Quant {
	value: number;
	min: number;
	max: number;
	rate: number;
	currentRate: number = 0;

	constructor( value: number, min: number, max: number, rate: number ) {
		this.value = value;
		this.min = min;
		this.max = max;
		this.rate = rate;
	}

	setMin() {
		this.value = this.min;
	}

	setMax() {
		this.value = this.max;
	}

	trans() {

	}

	update() {
		this.value += this.currentRate;

		if ( this.value > this.max ) {
			this.value = this.max;

			if ( this.currentRate > 0 ) {
				this.currentRate = 0;
			}
		} else if ( this.value < this.min ) {
			this.value = this.min;

			if ( this.currentRate < 0 ) {
				this.currentRate = 0;
			}
		}
	}
}

///////////
// LEVEL //
///////////

/*
	Scene holding a player area 
*/

export class Level extends Scene {

	boundKeyHandler = this.keyHandler.bind(this);

	em: EntityManager = null;
	grid: GridArea = null;

	player: Player = null;
	grav: Vec2 = new Vec2( 0, 1 );

	cursorPos: Vec2 = new Vec2( 0, 0 );
	data: any;

	// text box
	textBox: Entity = new Entity( 0, 300, 400, 0 );
	textBoxHeight: number = 50;//Quant = new Quant( 0, 0, 50, 2 );

	text: string = '';
	textIndex: number = 0;
	speaker: Entity = null;

	updateQueue: Array<() => boolean> = [];

	constructor( name: string, data: any ) {
		super( name );

		this.grid = new GridArea();

		this.em = new EntityManager();

		this.data = data;

		this.textBox.fillStyle = 'rgb(230, 230, 230)';
	}

	load(): Promise<any> {
		this.em.clear();
		this.grid = new GridArea();

		this.grid.load( this.data );
		this.begin();

		this.isLoaded = true;

		return new Promise( function(resolve, reject) {
			resolve(0);
		});
	}
	
	begin() {
		if ( this.data.drawNormal ) {
			Debug.flags.DRAW_NORMAL = true;
		} else {
			Debug.flags.DRAW_NORMAL = false;
		}

		for (let c = 0; c <= this.grid.hTiles; c++ ) {
			for (let r = 0; r <= this.grid.vTiles; r++ ) {
				let index = this.grid.spawnLayer.get( r, c );

				if ( index == 2 ) {
					this.player = new Player( c * this.grid.tileWidth, r * this.grid.tileHeight );
					this.em.insert( [this.player] );

				} else if ( index == 3 ) {
					let coin = new Coin( c * this.grid.tileWidth, r * this.grid.tileHeight );
					this.em.insert( [coin] );
				}
			}
		}

		let coins = this.em.entities.filter( x => x instanceof Coin );

		if ( this.name == 'level2' ) {
			this.queueText( coins[0], 'Check it out!' );
			this.queueText( this.player, 'Check what out?' );
			this.queueText( coins[0], 'It\'s a bottomless pit!' );
			this.queueText( this.player, 'Oh. I\'ve seen a lot of bottomless pits in my time. You just jump over.' );
			this.queueText( coins[0], 'Fine. You want something you\'ve never seen before?' );
			this.queueText( this.player, 'Please.' );
			this.queueText( coins[0], 'Okay, here goes.' );
			this.updateQueue.push( function(): boolean {
				Debug.flags.DRAW_NORMAL = false;

				return true;
			} )
			this.queueText( this.player, 'Agh!' );
			this.queueText( this.player, 'What happened? Where am I?' );
			this.queueText( coins[0], 'You haven\'t moved. The pit\'s still there, too.' );
			this.queueText( this.player, 'I can\'t see the pit either.' );
			this.queueText( coins[0], 'I\'m sure you\'ll find it.' );
			this.queueText( this.player, 'But where am I?' );
			this.queueText( coins[0], 'Now, don\'t go having a crisis just because you can\'t see your own body.' );
			this.queueText( coins[0], 'All you\'ve done is changed perspective.' );
			this.queueText( this.player, 'Yeah, from a bird\'s-eye view to a rat\'s-eye view...' );
			this.queueText( this.player, 'How do I get back to how it looked before?' );
			this.queueText( coins[0], 'Wouldn\'t that be, ah, boring? Ha ha ha.' )
			this.queueText( coins[0], 'If you must, you\'ll have to find all the other coins, I suppose. Have at it!' );
		}
	}

	wake() {
		document.addEventListener( "keydown", this.boundKeyHandler );
	}

	sleep() {
		document.removeEventListener( "keydown", this.boundKeyHandler );
	}

	keyHandler( e: any ) {
		if ( e.keyCode == KeyCode.Z ) {
			document.dispatchEvent( new CustomEvent( "transition", { detail: null } ) );
		}
	}

	update() {
		// some animation is playing
		if ( this.updateQueue.length > 0 ) {
			let finished = this.updateQueue[0]();

			if ( finished ) {
				this.updateQueue.shift();
			}

		// regular gameplay
		} else {
			this.defaultUpdate();
		}
	}

	defaultUpdate() {
		if ( Keyboard.keyHit( KeyCode.X ) ) {
			this.grav.scale( -1 );
		}

		if ( !this.player.collideDown ) {
			this.player.vel.y += this.grav.y;
		}

		//this.player.vel.setValues( 0, 0 );

		if ( Keyboard.keyHeld( KeyCode.LEFT ) && !this.player.collideLeft ) {
			this.player.vel.x = -5;
		}

		if ( Keyboard.keyHeld( KeyCode.RIGHT ) && !this.player.collideRight ) {
			this.player.vel.x = 5;
		}

		if ( this.player.collideDown ) {
			this.player.jumpFrames = this.player.maxJumpFrames;
		}

		if ( Keyboard.keyHit( KeyCode.UP ) && !this.player.collideUp && this.player.collideDown ) {
			this.player.jumping = true;
		}

		if ( Keyboard.keyHeld( KeyCode.UP ) && this.player.jumping && this.player.jumpFrames > 0 ) {
			this.player.vel.y = -5;
			this.player.jumpFrames -= 1;

		} else {
			this.player.jumping = false;
		}

		if ( Keyboard.keyHeld( KeyCode.DOWN ) && !this.player.collideDown ) {
			//this.player.vel.y = 5;
		}

		this.em.collide( this.grid );

		this.em.update();

		for ( let entity of this.em.entities ) {
			if ( entity instanceof Coin ) {
				if ( entity.overlaps( this.player ) ) {
					entity.removeThis = true;
				}
			}
		}

		let oldCoinCount = this.em.entities.filter( x => x instanceof Coin ).length;

		this.em.cull();
		this.em.grab();

		let coins = this.em.entities.filter( x => x instanceof Coin );

		if ( coins.length == 1 && oldCoinCount > coins.length && this.name == 'level1' ) {
			this.queueText( this.player, 'Is this all there is to it?' );
			this.queueText( coins[0], 'This is just the first level. Are you bored already?' );
			this.queueText( this.player, 'Whoa! Someone else is here. And yeah, I am kind of bored. Who are you?' );
			this.queueText( coins[0], 'I\'m the last coin. Touch me and I\'ll show you something really cool.' );
		}

		if ( coins.length == 0 ) {
			document.dispatchEvent( new CustomEvent( "complete", {} ) );
		}

		let boundary = 400;

		if ( this.player.posX < -boundary ||
			 this.player.posX > this.grid.hTiles * this.grid.tileWidth + boundary ||
			 this.player.posY < -boundary ||
			 this.player.posY > this.grid.vTiles * this.grid.tileWidth + boundary ) {
			document.dispatchEvent( new CustomEvent( "death", {} ) );
		}

		let t: string = this.player.posX + " " + this.player.vel.x + " " + this.player.collideLeft + " " + this.player.collideRight;

		document.dispatchEvent( new CustomEvent( "debug", { detail: t } ) );

		t = "";
		for ( let entity of this.em.entities ) {
			t += entity.posX + " " + entity.posY + " " + entity.width + " " + entity.height + "<br />";
		}
		document.dispatchEvent( new CustomEvent( "entities", { detail: t } ) );
	}

	updateCursor( pos: Vec2 ) {
		this.cursorPos.set( pos );
	}

	openTextBoxAnim(): boolean {
		this.textBox.height += 10;

		if ( this.textBox.height >= this.textBoxHeight ) {
			this.textBox.height = this.textBoxHeight;

			return true;
		} else {
			return false;
		}
	}

	displayTextUpdate(): boolean {
		if ( this.textIndex < this.text.length ) {
			this.textIndex += 1;
		}

		if ( this.textIndex >= this.text.length ) {
			if ( Keyboard.keyHit( KeyCode.RIGHT ) ) {
				return true;	
			} else {
				return false;
			}
		} else {
			if ( Keyboard.keyHit( KeyCode.RIGHT ) ) {
				this.textIndex = this.text.length;
			}

			return false;
		}		
	}

	closeTextBoxAnim(): boolean {
		this.textBox.height -= 10;

		if ( this.textBox.height <= 0 ) {
			this.textBox.height = 0;

			return true;
		} else {
			return false;
		}
	}

	queueText( speaker: Entity, text: string ) {
		this.updateQueue.push( function( this: Level ): boolean {
			this.textBox.height = 0;

			this.speaker = speaker;
			this.text = text;

			this.textIndex = 0;

			return true;
		}.bind( this ) );
		this.updateQueue.push( this.openTextBoxAnim.bind( this ) );
		this.updateQueue.push( this.displayTextUpdate.bind( this ) );
		this.updateQueue.push( function( this: Level ): boolean {
			this.speaker = null;
			this.text = '';

			return true;
		}.bind( this ) );
		this.updateQueue.push( this.closeTextBoxAnim.bind( this ) );
	}

	draw( context: CanvasRenderingContext2D ) {
		if ( Debug.flags.DRAW_NORMAL ) {
			context.save();
				this.grid.draw( context );	
				this.em.draw( context );
			context.restore();
		} else {
			context.lineWidth = 1;
			context.strokeStyle = 'black';

			context.fillStyle = 'black';
			context.fillRect( this.cursorPos.x, this.cursorPos.y, 2, 2 );

			let origin = new Vec2( this.player.posX + this.player.width / 2,
								   this.player.posY + this.player.height / 4 );

			let ir = 100;
			let or = 120;

			let count = 45;
			let slices: Array<number> = [];
			let cursorDir = this.cursorPos.minus( new Vec2( 200, 200 ) ).normalize();
			let defaultSlice = Math.PI * 2 / count;

			for ( let i = 0; i < count; i++ ) {
				let angle = defaultSlice * i;

				let dir = new Vec2( Math.cos( angle ), Math.sin( angle ) );

				if ( true || dir.dot( cursorDir ) > 0.7 ) {
					slices.push( defaultSlice / 4 );
					slices.push( defaultSlice / 4 );
					slices.push( defaultSlice / 4 );
					slices.push( defaultSlice / 4 );				
				} else if ( dir.dot( cursorDir ) > 0 ) {
					slices.push( defaultSlice / 2 );
					slices.push( defaultSlice / 2 );
				} else {
					slices.push( defaultSlice );
				}
			}

			let angle = 0;

			let shapes = this.grid.shapes.concat();
			for ( let entity of this.em.entities ) {
				if ( entity instanceof Coin ) {
					let shape = Shape.makeRectangle( entity.posX, entity.posY, entity.width, entity.height );
					shape.material = entity.fillStyle;

					shapes.push( shape );
				}
			}

			for ( let slice of slices ) {
				angle += slice / 2;

				let dir = new Vec2( Math.cos( angle ), Math.sin( angle ) );
				let dot = dir.dot( cursorDir );

				let hit = this.grid.shapecast( new Line( origin.x, origin.y,
														 origin.x + Math.cos( angle ) * 1000, 
														 origin.y + Math.sin( angle ) * 1000 ), shapes );
				let hitDist = -1;
				if ( hit !== null ) {
					hitDist = hit.point.minus( origin ).length();
				}

				/*let redness = 0;

				for ( let entity of this.em.entities ) {
					if ( entity instanceof Coin ) {
						let floaterPos = new Vec2( entity.posX, entity.posY );
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

				if ( hit !== null ) {
					/*context.beginPath();
					context.moveTo( origin.x, origin.y );
					context.lineTo( hit.point.x, hit.point.y );
					context.stroke();
					*/

					context.fillStyle = hit.material;
					context.globalAlpha = 1 / ( Math.sqrt( hitDist ) / 3 );
					context.save();
						context.translate( 200, 200 );
						context.beginPath();
						context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
						context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
						context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
						context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
						context.fill();
					context.restore();
					context.globalAlpha = 1.0;

					/*context.fillStyle = 'rgb(' + 255 + ', 0, 0)';
					context.globalAlpha = redness;
					context.save();
						context.translate( 200, 200 );
						context.beginPath();
						context.moveTo( Math.cos( angle - slice / 2 ) * ir, Math.sin( angle - slice / 2 ) * ir );
						context.lineTo( Math.cos( angle - slice / 2 ) * or, Math.sin( angle - slice / 2 ) * or );
						context.lineTo( Math.cos( angle + slice / 2 ) * or, Math.sin( angle + slice / 2 ) * or );
						context.lineTo( Math.cos( angle + slice / 2 ) * ir, Math.sin( angle + slice / 2 ) * ir );
						context.fill();
					context.restore();
					context.globalAlpha = 1.0;*/
				}

				angle += slice / 2;
			}
		}

		this.textBox.draw( context );

		if ( this.text != '' ) {
			if ( this.speaker !== null && this.textBox.height > 10 ) {
				context.fillStyle = this.speaker.fillStyle;
				context.fillRect( this.textBox.posX + 5,
								  this.textBox.posY + 5,
								  40,
								  this.textBox.height - 10 );
			}

			context.font = "10px Arial";
			context.fillStyle = 'black';

			let y = 15;
			let lineWidth = 50;
			let word = '';
			let line = '';
			let lineStart = 0;

			for ( let i = 0; i < this.textIndex; i++ ) {
				word += this.text[i];

				if ( this.text[i] == ' ' ) {
					line += word;
					word = '';
				}

				// on spaces, decide whether to print the line and move to the next one
				let index = this.text.indexOf( ' ', i+1 );
				if ( index < 0 ) index = this.text.length;
				let crossed = index > lineStart + lineWidth;

				if ( i == this.textIndex - 1 ) {
					context.fillText( line + word, 100, this.textBox.posY + y );

				} else if ( crossed ) {
					lineStart += line.length;

					context.fillText( line, 100, this.textBox.posY + y );
					line = '';
					y += 15;
				}
			}
		}
	}
}