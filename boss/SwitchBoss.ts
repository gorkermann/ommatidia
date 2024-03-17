import { Anim, AnimField, PhysField, AnimFrame, AnimTarget, TurnDir } from '../lib/juego/Anim.js'
import { Angle } from '../lib/juego/Angle.js'
import { Newable } from '../lib/juego/constructors.js'
import { Entity, cullList, TransformOrder } from '../lib/juego/Entity.js'
import { Range } from '../lib/juego/Editable.js'
import { Contact } from '../lib/juego/Contact.js'
import { Material } from '../lib/juego/Material.js'
import { FuncCall } from '../lib/juego/serialization.js'  
import { Shape } from '../lib/juego/Shape.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { Dict } from '../lib/juego/util.js'

import { CenteredEntity } from '../CenteredEntity.js'
import { COL, MILLIS_PER_FRAME } from '../collisionGroup.js'
import { Explosion } from '../Explosion.js'
import { Bullet, Gutter } from '../Bullet.js'

import * as Debug from '../Debug.js'

import { Attack, AttackReq } from './Attack.js'
import { Boss, BossState } from './Boss.js'
import { Switch } from './Switch.js'

let fieldWidth = 600;
let interiorWidth = 200;
let wallUnit = 20;

let attacks = [
	new Attack(
		'rotate',
		[{
			noneOf: ['shell-shed']
		}]
	),
	new Attack(
		'shoot',
		[{
			allOf: ['shell-shed']
		}]
	),
]

function getAttack( name: string ): Attack {
	for ( let attack of attacks ) {
		if ( attack.name == name ) {
			return attack
		}
	}

	throw new Error( 'getAttack: No attack named ' + name );

	return null;
}

let attackNames = attacks.map( x => x.name );
Debug.fields['SWITCH_ATK'].default = attackNames.join( ',' );
Debug.validators['SWITCH_ATK'] = Debug.arrayOfStrings( attackNames );

class SwitchBossBarrier extends CenteredEntity {
	altMaterial = new Material( 210, 1.0, 0.9 );

	// overrides
	material = new Material( 210, 1.0, 0.7 );
	drawWireframe = true;

	constructor( pos: Vec2, diameter: number ) {
		super( pos, diameter, diameter );
	}

	/* Entity overrides */

	getShapes(): Array<Shape> {
		let shape = Shape.makeCircle( this.pos, this.width, 16, -0.5 );

		shape.material = this.material;
		shape.parent = this;
		shape.hollow = true;

		for ( let i = 0; i < shape.edges.length; i++ ) {
			if ( this.altMaterial && i % 2 == 0 ) {
				shape.edges[i].material = this.altMaterial;
			}
		
			shape.normals[i].flip();
		}

		return [shape];
	}

	draw( context: CanvasRenderingContext2D ) {
		for ( let shape of this.getShapes() ) {
			shape.stroke( context );
		}
	}
}

class SwitchBossBomb extends CenteredEntity {
	watchTarget: Vec2 = null;

	burstCount: number = 12;
	burstSpeed: number = 3;

	//health: number = 5;
	invuln: boolean = false;
	flash: number = 0.0;
	alpha: number = 1.0;

	/* property overrides */

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', 2 ), // thread 0
		//'angle': new PhysField( this, 'angle', 'angleVel', 0.02, { isAngle: true } ), // thread 0
		'flash': new AnimField( this, 'flash', 0.1 ), // thread 1
		'alpha': new AnimField( this, 'alpha', 0.2 ), // thread 0
		'angleVel': new AnimField( this, 'angleVel', 0.001 ) // thread 0
	},
	new AnimFrame( {
		'flash': { value: 0.0 }
	} ) );

	material = new Material( 15, 1.0, 0.6 );

	collisionMask: number = COL.PLAYER_BULLET | COL.LEVEL;

	switchCount: number = 1;

	/**
	 * Player needs to trip all switches before burstDelay elapses and burst() is called
	 * 
	 * @param {Vec2}   pos        [description]
	 * @param {number} burstDelay [description]
	 */
	constructor( pos: Vec2=new Vec2( 0, 0 ), burstDelay: number=0 ) {
		super( pos, 30, 30 );

		for ( let i = 0; i < 1; i++ ) {
			let sw = new SwitchBossCover( new Vec2( 0, this.height / 2 ), wallUnit, wallUnit / 2 );
			sw.health = 1;
			sw.angle = Math.PI * i;
			sw.collisionGroup = COL.ENEMY_BODY;
			sw.collisionMask = COL.PLAYER_BULLET;
			this.addSub( sw );
		}

		this.angleVel = 0.1 * ( Math.random() > 0.5 ? 1 : -1 );

		this.anim.pushFrame( new AnimFrame( {
			'alpha': { value: 0 }
		},
			[ new FuncCall<typeof this.burst>( this, 'burst', [] ) ]
		) );

		this.anim.pushFrame( new AnimFrame( {
			'alpha': { value: 1.0, expireOnCount: burstDelay },
			'angleVel': { value: 0.0, reachOnCount: burstDelay - 1000 }
		} ) );
	}

	isUnlocked(): boolean {
		for ( let sub of this.getSubs() ) {
			if ( sub instanceof SwitchBossCover && sub.alpha > 0 ) return false; // slight difference from SwitchBossSide (here unlocked at start of fade)
		} 

		return true;
	}

	burst() {
		let slice = Math.PI * 2 / this.burstCount;
		for ( let i = 0; i < this.burstCount; i++ ) {
			let bullet = new Bullet( this.pos.copy(), new Vec2( this.burstSpeed, 0 ).rotate( i * slice ) );

			this.spawnEntity( bullet );

			bullet.collisionGroup = COL.ENEMY_BULLET;
			bullet.collisionMask = 0;
		}
	}

	/* Entity overrides */

	hitWith( otherEntity: Entity, contact: Contact ) {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;
		}

		if ( !this.isUnlocked() ) {
			if ( contact.sub instanceof SwitchBossCover ) {
				contact.sub.hit();

				this.angleVel = 0.0;
				this.anim.clear(); // stop spinning
			}
		}
	}

	update() {
		// start fade when unlocked
		if ( this.isUnlocked() ) {
			this.anim.clear();

			//this.angleVel = 0;

			this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 0 }
			} ) );
		}

		// kill when faded
		if ( this.alpha <= 0 ) {
			this.removeThis = true;
		}
	}

	shade() {
		this.material.skewL = this.flash;
		this.material.alpha = this.alpha;

		super.shade();

		for ( let sub of this.getSubs() ) {
		//	sub.material.alpha = this.alpha;
		}
	}
}

/**
 * each SwitchBossSide has three SwitchBossCovers on it
 */
class SwitchBossCover extends CenteredEntity {
	health: number = 3;
	flash: number = 0.0;
	alpha: number = 1.0;

	wait: boolean = false;

	/* property overrides */
	material: Material = new Material( 15, 1.0, 0.1 );

	anim: Anim = new Anim( {
		'flash': new AnimField( this, 'flash', 0.1 ),
		'alpha': new AnimField( this, 'alpha', 0.1 ),
		'wait': new AnimField( this, 'wait' )
	} );

	hit() {
		this.health -= 1;

		if ( this.health > 0 ) {
			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.0 }
			} ) );
			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 1.0, overrideRate: 0 }
			} ) );
		} else {
			this.anim.pushFrame( new AnimFrame( {
				'alpha': { value: 0.0 }
			} ) );
		}
	}

	shade() {
		this.material.skewL = this.flash;
		this.material.alpha = this.alpha;
	}
}

/**
 * boss starts with four SwitchBossSides in a square arrangement
 */
class SwitchBossSide extends CenteredEntity {
	alpha: number = 1.0;

	whiteMaterial = new Material( 0, 0.0, 1.0 );

	covers: Array<SwitchBossCover> = [];

	wait: boolean = false;

	/* property overrides */

	material = new Material( 15, 1.0, 0.3 );
	altMaterial = new Material( 15, 1.0, 0.5 );

	constructor( pos: Vec2, angle: number ) {
		super( pos, wallUnit, wallUnit * 5 ); // vertical

		this.angle = angle;

		let swSpacing = wallUnit * 1.5;
		let swOrigin = new Vec2( this.width / 2, -swSpacing );

		for ( let i = 0; i < 3; i++ ) {
			let sw = new CenteredEntity( 
				new Vec2( 0, swSpacing * i ).plus( swOrigin ), wallUnit / 4, wallUnit / 2 );
			sw.collisionGroup = COL.ENEMY_BODY;
			sw.collisionMask = COL.PLAYER_BULLET;

			sw.material = this.whiteMaterial;

			this.addSub( sw );
		}

		for ( let i = 0; i < 3; i++ ) {
			let cov = new SwitchBossCover( 
				new Vec2( 0, swSpacing * i ).plus( swOrigin ), wallUnit / 2, wallUnit );
			cov.collisionGroup = COL.ENEMY_BODY;
			cov.collisionMask = COL.PLAYER_BULLET;

			this.covers.push( cov );
			this.addSub( cov );
		}
	}

	isUnlocked(): boolean {
		for ( let i = 0; i < 3; i++ ) {
			if ( this.covers[i].alpha > 0 ) return false;
		} 

		return true;
	}

	/* Entity overrides */

	update() {
		for ( let i = 0; i < 3; i++ ) {
			if ( this.covers[i].alpha == 0 && this.covers[i].anim.isDone() ) {
				this.covers[i].anim.pushFrame( new AnimFrame(
					{}, [new FuncCall<typeof this.fire>( this, 'fire', [i] )]
				) );
				this.covers[i].anim.pushFrame( new AnimFrame( {
					'wait': { value: true, expireOnCount: 2000 + Math.random() * 500 }
				} ) );
			}
		}
	}

	fire( index: number ) {
		if ( this.alpha < 1.0 ) return;

		if ( index >= this.covers.length ) {
			console.error( 'SwitchBossSide.fire(): index out of range (' + index + ')' );
		}

		let outward = this.applyTransform( new Vec2( 1, 0 ), 0.0, { angleOnly: true } );
		outward.rotate( Math.random() * 1.0 - 0.5 );

		let bullet = new Bullet( 
			this.applyTransform( this.covers[index].pos.copy() ),
			outward.times( 10 )
		);

		this.spawnEntity( bullet );
		bullet.collisionGroup = COL.ENEMY_BULLET;
	}

	getShapes( step: number=1.0 ): Array<Shape> {
		if ( this.alpha == 0 ) return [];

		else return super.getShapes( step );
	}

	shade() {
		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		super.shade();

		for ( let sub of this.getSubs() ) {
		//	sub.scaleAlpha( this.alpha );
		}
	}
}

type BossFlags = {
	health: number
	current_attack_damage: number
	retreating: boolean
	all_sides_unlocked: boolean
	shell_shed: boolean
}

export class SwitchBoss extends Boss {
	shell: CenteredEntity;
	sides: Array<SwitchBossSide> = [];
	bombs: Array<SwitchBossBomb> = []; // track bombs 

	flash: number = 0.0;

	flags: BossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false,
		all_sides_unlocked: false,
		shell_shed: false
	};

	currentIndex: number = 0;

	wait: number = 0;
	sideWaitTime: number = 2000;

	/* property overrides */

	flavorName = 'SWITCH CORE';

	health = 100;

	material = new Material( 15, 1.0, 0.5 );

	collisionGroup = COL.ENEMY_BODY;
	collisionMask = COL.PLAYER_BULLET;

	anim = new Anim( {
		'pos': new PhysField( this, 'pos', 'vel', 2 ),
		'alpha': new AnimField( this, 'alpha', 0.05 ),
		'wait': new AnimField( this, 'wait' ),
		'flash': new AnimField( this, 'flash' ),
		'invuln': new AnimField( this, 'invuln' ),
		'state': new AnimField( this, 'state' ),
	},
	new AnimFrame( {
		'flash': { value: 0.0 },
		'invuln': { value: false },
	} ) );

	constructor( pos: Vec2=new Vec2( 0, 0 ), spawn: boolean=false ) {
		super( pos, 40, 40 );

		this.flags['health'] = this.getHealth();

		this.shell = new CenteredEntity( new Vec2( 0, 0 ), wallUnit, wallUnit );
		this.shell.isGhost = true;
		this.addSub( this.shell );

		this.anim.fields['angle'] = new PhysField( this.shell, 'angle', 'angleVel', 0.1, { isAngle: true } );

		let slice = Math.PI * 2 / 4;

		for ( let i = 0; i < 4; i++ ) {
			let side = new SwitchBossSide( new Vec2( wallUnit * 3, 0 ), slice * i );
			side.collisionGroup = COL.ENEMY_BODY;
			side.collisionMask = COL.PLAYER_BULLET;

			this.anim.fields['side' + i + '-pos'] = new PhysField( side, 'pos', 'vel', 2 );
			this.anim.fields['side' + i + '-angle'] = new PhysField( side, 'angle', 'angleVel', 0.04, { isAngle: true } );
			this.anim.fields['side' + i + '-alpha'] = new AnimField( side, 'alpha', 0.05 );

			this.sides.push( side );
			this.shell.addSub( side );
		}

		if ( spawn ) {
			let barrier = new SwitchBossBarrier( this.pos.copy(), fieldWidth );
			this.spawnEntity( barrier );
			barrier.collisionGroup = COL.LEVEL;
		}
	}

	shootBomb( targetPos: Vec2, burstDelay: number ) {
		let bomb = new SwitchBossBomb( this.pos.copy(), burstDelay );

		bomb.anim.pushFrame( new AnimFrame( {
			'pos': { value: targetPos }
		} ) );

		this.bombs.push( bomb );

 		this.spawnEntity( bomb );
		bomb.collisionGroup = COL.ENEMY_BODY;
		bomb.collisionMask = COL.PLAYER_BULLET;
	}

	/* Entity overrides */

	hitWith( otherEntity: Entity, contact: Contact ): void {
		if ( otherEntity instanceof Bullet ) {
			otherEntity.removeThis = true;

			// if ( contact.sub instanceof Switch ) {
			// 	for ( let side of this.sides ) {
			// 		if ( side == contact.sub.parent && !side.isUnlocked() ) {
			// 			contact.sub.push();
			// 		}
			// 	}

			// 	return;
			// }

			if ( contact.sub instanceof SwitchBossCover ) {
				contact.sub.hit();

				return;
			}

			if ( this.invuln ) return;
			if ( contact.sub != this ) return; // no weak points except eye

			this.damage( 1 );
		}
	}

	/* Boss overrides */

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}

	defaultLogic() {
		/* flag checks */
		let present: Array<string> = [];

		let health = this.getHealth();
		if ( health < this.flags['health'] ) {
			this.flags['current_attack_damage'] += this.flags['health'] - health;
			this.flags['health'] = health;
		}

		// shed shell
		if ( this.allSidesUnlocked() ) {
			this.flags['all_sides_unlocked'] = true;
		}

		if ( this.flags['all_sides_unlocked'] && !this.flags['shell_shed'] ) {
			this.anim.clear( { withoutTag: 'exit' } );

			let frame = new AnimFrame();

			for ( let [i, side] of Object.entries( this.sides ) ) {
				frame.targets['side' + i + '-alpha'] = new AnimTarget( 0.0 );
			}

			this.anim.pushFrame( frame );

			this.flags['shell_shed'] = true;
		}

		if ( this.flags['shell_shed'] ) present.push( 'shell-shed' );

		/* attack change */
		if ( this.anim.isDone( [0] ) ) {
			if ( Debug.flags.FORCE_BOSS_ATK ) {
				let names = Debug.fields.SWITCH_ATK.value.split( ',' );
				let debugAttacks = attacks.filter( x => names.includes( x.name ) );

				if ( debugAttacks.length > 0 ) {
					let index = Math.floor( Math.random() * debugAttacks.length )
					this.attack = debugAttacks[index];

				} else {
					console.warn( 'ShellBoss.defaultLogic: no valid attacks from debug' );
				}

			} else if ( !this.attack ) {
				this.attack = getAttack( 'rotate' );

			} else if ( this.counter ) {
				this.attack = this.counter;
				this.counter = null;

			} else {
				let possibleAttacks = attacks.filter( x => x.canEnter( present ) );

				if ( this.attack && possibleAttacks.length > 1 ) {
					possibleAttacks = possibleAttacks.filter( x => x != this.attack );
				}

				if ( possibleAttacks.length == 0 ) {
					this.messages.push( 'The SWITCH CORE surrenders!\n' );
					this.state = BossState.DEAD;
					return;
				}

				let index = Math.floor( Math.random() * possibleAttacks.length );
				this.attack = possibleAttacks[index];
			}

			console.log( 'Beginning attack ' + this.attack.name ); // + ' (' + possibleAttacks.map( x => x.name ) + ')' );
			this.flags['current_attack_damage'] = 0;
			this.flags['retreating'] = false;

			this.anim.clear( { withoutTag: 'exit' } );

			// rotate
			if ( this.attack.name == 'rotate' ) {
				for ( let i = 0; i < this.sides.length; i++ ) {
					this.currentIndex += 1;
					this.currentIndex %= this.sides.length;

					if ( this.sides[this.currentIndex].alpha > 0.0 ) {
						break;
					}
				}

				this.anim.pushFrame( new AnimFrame( {
					'wait': { value: this.wait, expireOnCount: this.sideWaitTime }
				} ) );
				this.anim.pushFrame( new AnimFrame( {
					'angle': { value: this.currentIndex * Math.PI / 2 - Math.PI / 2, turnDir: TurnDir.CW }
				} ) );
			
			// shoot
			} else if ( this.attack.name == 'shoot' ) {
				cullList( this.bombs );

				if ( this.bombs.length == 0 ) {
					let angle = 0.3 + Math.random() * 0.3;
					angle *= Math.random() > 0.5 ? 1 : -1;

					this.shootBomb( this.watchTarget.rotate( angle ).plus( this.pos ), 2000 );

					this.anim.pushFrame( new AnimFrame( {
						'wait': { value: this.wait, expireOnCount: 3000 }
					} ) );
				}
			}
		}
	}

	/* Unique */

	allSidesUnlocked(): boolean {
		for ( let side of this.sides ) {
			if ( !side.isUnlocked() ) return false;
		}

		return true;
	}
}

export let constructors: Dict<Newable> = { 
	'SwitchBossBarrier': SwitchBossBarrier,
	'SwitchBossSide': SwitchBossSide,
	'SwitchBossCover': SwitchBossCover,
	'SwitchBossBomb': SwitchBossBomb,
	'SwitchBoss': SwitchBoss
}