import { Anim, AnimField, AnimFrame } from './lib/juego/Anim.js'
import { Contact } from './lib/juego/Contact.js'
import { Entity } from './lib/juego/Entity.js'
import { Shape } from './lib/juego/Shape.js'
import { Material } from './lib/juego/Material.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { CenteredEntity } from './CenteredEntity.js'
import { Coin } from './Coin.js' 

import { PlayerStatus } from './Player.js'

import { RollBoss } from './boss/RollBoss.js' 
import { LockBoss } from './boss/LockBoss.js'
import { ShellBoss } from './boss/ShellBoss.js'
import { SwitchBoss } from './boss/SwitchBoss.js'
import { SnakeBoss } from './boss/SnakeBoss.js'
import { CarrierBoss } from './boss/CarrierBoss.js'

import { COL } from './collisionGroup.js'

class Portal extends CenteredEntity {
	index: number;
	name: string;
	coin: Coin = new Coin( new Vec2( 0, 0 ) );

	playerIn: boolean = false;
	prompted: boolean = false;

	defeated: boolean = false;

	/* property overrides */

	flavorName: string = 'PORTAL COURTYARD';

	constructor( pos: Vec2, material: Material, index: number, name: string ) {
		super( pos, 50, 50 );

		this.material = material;

		this.index = index;
		this.name = name;

		this.collisionGroup = COL.ITEM;
		this.collisionMask = COL.PLAYER_BODY;

		this.coin.flavorName = 'PORTAL';
		this.coin.collisionGroup = COL.ITEM;
		this.coin.collisionMask = COL.PLAYER_BODY;
		this.addSub( this.coin );
	}

	update() {
		if ( this.playerIn ) {
			if ( !this.prompted ) { 
				if ( !this.defeated ) {
					this.parent.messages.push( 'Press W to face the ' + this.name );
					this.parent.messages.push( 'Or S to cancel' );
				} else {
					this.parent.messages.push( 'You have already defeated the ' + this.name );
					this.parent.messages.push( 'Press W to face the ' + this.name + ' again');
					this.parent.messages.push( 'Or S to cancel' );
				}

				this.parent.messages.push( '!prompt, begin ' + this.index + ', cancel' );

				this.prompted = true;
			}

		} else {
			this.prompted = false;
		}

		this.playerIn = false;
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( contact.sub == this.coin ) {
			this.playerIn = true;
		}
	}
}

type PortalSpec = {
	index: number,
	name: string,
	material: Material,
}

export class PortalRing extends CenteredEntity {
	
	/* property overrides */
	
	collisionGroup = COL.ITEM;
	isGhost = true;

	constructor( pos: Vec2, playerStatus: PlayerStatus ) {
		super( pos, 20, 20 );

		let specs: Array<PortalSpec> = [];

		specs.push( { index: 1, name: 'LOCK CORE', material: new Material( LockBoss.hue, 1.0, 0.5 ) } );
		specs.push( { index: 4, name: 'SWITCH CORE', material: new Material( 15, 1.0, 0.3 ) } );
		specs.push( { index: 6, name: 'ORBIT CORE', material: new Material( CarrierBoss.hue, 1.0, 0.5 ) } );
		specs.push( { index: 3, name: 'SHELL CORE', material: new Material( ShellBoss.hue, 1.0, 0.5 ) } );
		specs.push( { index: 2, name: 'ROLL CORE', material: new Material( RollBoss.hue, 1.0, 0.5 ) } );
		specs.push( { index: 5, name: 'SNAKE CORE', material: new Material( SnakeBoss.hue, 1.0, 0.5 ) } );

		let slice = Math.PI * 2 / specs.length;
		let radius = 100;

		for ( let i = 0; i < specs.length; i++ ) {
			let portal = new Portal( Vec2.fromPolar( slice * i, radius ), specs[i].material, specs[i].index, specs[i].name );

			if ( playerStatus.defeatedNames.includes( specs[i].name ) ) {
				portal.material.sat = 0.1;
				portal.defeated = true;
			}

			this.addSub( portal );
		}
	}

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( contact.sub instanceof Coin && contact.sub.parent ) {
			contact.sub.parent.hitWith( otherEntity, contact );
		}
	}
}