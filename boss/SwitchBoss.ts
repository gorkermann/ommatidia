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
import { Boss, BossState, BossFlags } from './Boss.js'
import { Switch } from './Switch.js'

let fieldWidth = 600;
let interiorWidth = 200;
let wallUnit = 20;

let attacks = [
	new Attack(
		'rotate',
		[]
	),
	new Attack(
		'shoot',
		[]
	),
	new Attack(
		'burp',
		[]
	),
]

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
		'pos': new PhysField( this, 'pos', 'vel', 10 ), // thread 0
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

		for ( let i = 0; i < 1; i += 2 ) {
			let sw = new SwitchBossCover( new Vec2( 0, -this.height / 2 ), wallUnit, wallUnit / 2 );
			sw.angle = Math.PI * i / 2;
			sw.health = 1;
			sw.collisionGroup = COL.LEVEL;
			sw.collisionMask = COL.PLAYER_BULLET;
			this.addSub( sw );
		}

		this.angleVel = 0.2 * ( Math.random() > 0.5 ? 1 : -1 );

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

				//this.angleVel = 0.0;
				//this.anim.clear(); // stop spinning
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

	wait: boolean = false;

	coreMaterial = new Material( 30, 1.0, 0.5 );

	/* property overrides */
	material: Material = new Material( 15, 1.0, 0.1 );

	anim: Anim = new Anim( {
		'flash': new AnimField( this, 'flash', 0.1 ),
		'alpha': new AnimField( this, 'alpha', 0.1 ),
		'wait': new AnimField( this, 'wait' )
	} );

	getOwnShapes(): Array<Shape> {
		let shapes = super.getOwnShapes();

		shapes[0].edges[0].material = this.coreMaterial; // top
		shapes[0].edges[2].material = this.coreMaterial; // bottom

		return shapes;
	}

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
		let now = new Date().getTime();

		this.material.skewL = this.flash;
		this.material.alpha = this.alpha;

		this.coreMaterial.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );
	}
}

/**
 * boss starts with four SwitchBossSides in a square arrangement
 */
class SwitchBossSide extends CenteredEntity {
	whiteMaterial = new Material( 0, 0.0, 1.0 );
	grayMaterial = new Material( 0, 0.0, 0.5 );

	coverCount: number;
	covers: Array<SwitchBossCover> = [];

	wait: boolean = false;

	/* property overrides */

	material = new Material( 15, 1.0, 0.3 );
	altMaterial = new Material( 15, 1.0, 0.5 );

	constructor( pos: Vec2, angle: number, coverCount: number ) {
		super( pos, wallUnit, wallUnit * 5 ); // vertical

		this.angle = angle;

		this.coverCount = coverCount;
		let swSpacing = wallUnit * 1.5;
		let swWidth = swSpacing * ( this.coverCount - 1 );
		let swOrigin = new Vec2( this.width / 2, -swWidth / 2 );

		for ( let i = 0; i < this.coverCount; i++ ) {
			let cov = new SwitchBossCover( 
				new Vec2( 0, swSpacing * i ).plus( swOrigin ), wallUnit / 2, wallUnit );
			cov.collisionGroup = COL.LEVEL;
			cov.collisionMask = COL.PLAYER_BULLET;

			this.covers.push( cov );
			this.addSub( cov );
		}

		for ( let i = 0; i < this.coverCount; i++ ) {
			let sw = new CenteredEntity( 
				new Vec2( 0, swSpacing * i ).plus( swOrigin ), wallUnit / 4, wallUnit / 2 );
			sw.collisionGroup = COL.LEVEL;
			sw.collisionMask = COL.PLAYER_BULLET;

			sw.material = this.grayMaterial.copy();

			this.covers[i].anim.fields['skewL'] = new AnimField( sw.material, 'skewL', 0.05 );

			this.addSub( sw );
		}
	}

	isUnlocked(): boolean {
		for ( let cover of this.covers ) {
			if ( cover.alpha == 1.0 ) return false;
		} 

		return true;
	}

	/* Entity overrides */

	update() {
		for ( let i = 0; i < this.coverCount; i++ ) {
			if ( this.covers[i].alpha == 0 && this.covers[i].anim.isDone() ) {
				this.covers[i].anim.pushFrame( new AnimFrame( {
					'skewL': { value: 0.0, overrideRate: 0 }
                }, 
                	[new FuncCall<typeof this.fire>( this, 'fire', [i] )]
				) );

				let time = 2000 + Math.random() * 500;

				this.covers[i].anim.pushFrame( new AnimFrame( {
					'skewL': { value: 0.5, reachOnCount: time },
					'wait': { value: true, expireOnCount: time }
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

	shade() {
		this.material.alpha = this.alpha;
		this.altMaterial.alpha = this.alpha;

		super.shade();

		for ( let sub of this.getSubs() ) {
			//sub.material.alpha *= this.alpha;
			//( sub as CenteredEntity ).altMaterial.alpha *= this.alpha;
		}
	}
}

type SwitchBossFlags = BossFlags & {
	cover_count: number;
	max_cover_count: number;
	all_sides_unlocked: boolean;
	shell_shed: boolean;
}

export class SwitchBoss extends Boss {
	shell: CenteredEntity;
	sides: Array<SwitchBossSide> = [];
	bombs: Array<SwitchBossBomb> = []; // track bomb count (they are independent entities)

	flash: number = 0.0;

	currentIndex: number = 0;

	wait: number = 0;
	sideWaitTime: number = 2000;

	/* property overrides */

	flags: SwitchBossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false,
		cover_count: 1,
		max_cover_count: 3,
		all_sides_unlocked: false,
		shell_shed: false
	};

	attacks = attacks;

	overrideAttackField = 'SWITCH_ATK';

	flavorName = 'SWITCH CORE';

	health = 30;

	material = new Material( 15, 1.0, 0.5 );

	collisionGroup = COL.LEVEL;
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

		this.shell = new CenteredEntity( new Vec2( 0, 0 ), wallUnit, wallUnit );
		this.shell.isGhost = true;
		this.addSub( this.shell );

		this.anim.fields['angle'] = new PhysField( this.shell, 'angle', 'angleVel', 0.01, { isAngle: true } );

		let invisibleWall = new CenteredEntity( new Vec2( 0, 0 ), wallUnit * 5, wallUnit * 7 );
		invisibleWall.material.alpha = 0.0;
		invisibleWall.collisionGroup = COL.LEVEL;
		// don't set collisionMask
		this.shell.addSub( invisibleWall );

		invisibleWall = new CenteredEntity( new Vec2( 0, 0 ), wallUnit * 7, wallUnit * 5 );
		invisibleWall.material.alpha = 0.0;
		invisibleWall.collisionGroup = COL.LEVEL;
		// don't set collisionMask
		this.shell.addSub( invisibleWall );

		this.rebuildSides();

		this.anim.pushFrame( new AnimFrame( {
			'wait': { value: 0, expireOnCount: 500 }
		} ) );

		if ( spawn ) {
			let barrier = new SwitchBossBarrier( this.pos.copy(), fieldWidth );
			this.spawnEntity( barrier );
			barrier.collisionGroup = COL.LEVEL;
		}
	}

	/**
	 * [rebuildSides description]
	 *
	 * flags: all_sides_unlocked
	 * 
	 * @param {boolean=true} fadeIn [description]
	 */
	rebuildSides( fadeIn: boolean=true ) {
		// remove old sides
		this.sides = [];
		
		for ( let sub of this.shell.getSubs() ) {
			if ( sub instanceof SwitchBossSide ) sub.removeThis = true;
		}

		this.shell.cull();

		for ( let i = 0; i < 4; i++ ) {
			delete this.anim.fields['side' + i + '-pos'];
			delete this.anim.fields['side' + i + '-angle'];
			delete this.anim.fields['side' + i + '-alpha'];
		}

		// make new sides
		let slice = Math.PI * 2 / 4;

		for ( let i = 0; i < 4; i++ ) {
			let side = new SwitchBossSide( new Vec2( wallUnit * 3, 0 ), slice * i, this.flags['cover_count'] );
			this.spawnEntity( side );
			side.collisionGroup = COL.LEVEL;
			side.collisionMask = COL.PLAYER_BULLET;

			this.anim.fields['side' + i + '-pos'] = new PhysField( side, 'pos', 'vel', 2 );
			this.anim.fields['side' + i + '-angle'] = new PhysField( side, 'angle', 'angleVel', 0.04, { isAngle: true } );
			this.anim.fields['side' + i + '-alpha'] = new AnimField( side, 'alpha', 0.05 );

			this.sides.push( side );
			this.shell.addSub( side );
		}

		if ( fadeIn ) {
			for ( let side of this.sides ) {
				side.alpha = 0.0;
			}

			let frame = new AnimFrame();

			for ( let [i, side] of Object.entries( this.sides ) ) {
				frame.targets['side' + i + '-alpha'] = new AnimTarget( 1.0 );
			}

			this.anim.pushFrame( frame );	
		}

		this.flags['all_sides_unlocked'] = false;
	}

	shootBomb( targetPos: Vec2, burstDelay: number ) {
		let bomb = new SwitchBossBomb( this.pos.copy(), burstDelay );

		bomb.anim.pushFrame( new AnimFrame( {
			'pos': { value: targetPos }
		} ) );

		this.bombs.push( bomb );

 		this.spawnEntity( bomb );
		bomb.collisionGroup = COL.LEVEL;
		bomb.collisionMask = COL.PLAYER_BULLET;
	}

	/* Entity overrides */

	/**
	 * [hitWith description]
	 *
	 * flags: none
	 * 
	 * @param {Entity}  otherEntity [description]
	 * @param {Contact} contact     [description]
	 */
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

	kill() {
		super.kill();

		for ( let bomb of this.bombs ) {
			bomb.anim.clear();
		}
	}

	/* Boss overrides */

	animate( step: number, elapsed: number ) {
		super.animate( step, elapsed ); // eye animations

		this.anim.update( step, elapsed );
	}

	canEnter( attack: Attack ): boolean {
		if ( attack.name == 'rotate' ) {
			return !this.flags['shell_shed'];

		} else if ( attack.name == 'burp' ) {
			return false;//this.flags['cover_count'] > 2 && this.bombs.length == 0;

		} else if ( attack.name == 'shoot') {
			return false;//this.flags['shell_shed'];
		}

		return false;
	}

	/**
	 * [defaultLogic description]
	 *
	 * flags: health, current_attack_damage, all_sides_unlocked, cover_count
	 * 
	 */
	defaultLogic() {
		/* flag checks */

		cullList( this.bombs );

		let health = this.getHealth();
		if ( health < this.flags['health'] ) {
			this.flags['current_attack_damage'] += this.flags['health'] - health;
			this.flags['health'] = health;
		}

		// shed shell
		if ( this.allSidesUnlocked() && !this.flags['all_sides_unlocked'] ) {
			this.flags['all_sides_unlocked'] = true;
			this.flags['cover_count'] += 1;
			if ( this.flags['cover_count'] > 3 ) this.flags['cover_count'] = 3;

			this.anim.clear( { withoutTag: 'exit' } );

			this.anim.pushFrame( new AnimFrame( {}, [
				new FuncCall<typeof this.rebuildSides>( this, 'rebuildSides', [] )
			] ) );

			this.anim.pushFrame( new AnimFrame( {
				'wait': { value: 0, expireOnCount: 2000 }
			} ) );

			let frame = new AnimFrame();

			for ( let [i, side] of Object.entries( this.sides ) ) {
				frame.targets['side' + i + '-alpha'] = new AnimTarget( 0.0 );
			}

			this.anim.pushFrame( frame );
		}

		/* attack change */
		if ( this.anim.isDone( [0] ) ) {
			this.chooseAttack();

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
				if ( this.bombs.length == 0 ) {
					this.shootBomb( this.watchTarget.turned(  0.2 + Math.random() * 0.2 ).plus( this.pos ), 4000 );
					this.shootBomb( this.watchTarget.turned( -0.2 - Math.random() * 0.2 ).plus( this.pos ), 5000 );

					this.anim.pushFrame( new AnimFrame( {
						'wait': { value: this.wait, expireOnCount: 1000 }
					} ) );

				} else {
					this.anim.pushFrame( new AnimFrame( {
						'wait': { value: this.wait, expireOnCount: 1000 }
					} ) );
				}

			// burp
			} else if ( this.attack.name == 'burp' ) {
				// choose corner closest to player
				let watchAngle = this.watchTarget.angle(); 

				let angle = Angle.toPosTurn( watchAngle - this.shell.angle );
				let index = Math.floor( angle / ( Math.PI / 2 ) ); // 0-3

				let angleTargets: Array<number> = [];
				for ( let i = 0; i < this.sides.length; i++ ) {
					angleTargets.push( this.sides[i].angle );
				}

				angleTargets[index] -= 0.2;
				angleTargets[(index + 3) % 4] -= 0.1;
				
				angleTargets[(index + 1) % 4] += 0.2;
				angleTargets[(index + 2) % 4] += 0.1;

				// close sides
				this.anim.pushFrame( new AnimFrame( {
					'side0-pos': { value: new Vec2( wallUnit * 3, 0 ) },
					'side1-pos': { value: new Vec2( wallUnit * 3, 0 ) },
					'side2-pos': { value: new Vec2( wallUnit * 3, 0 ) },
					'side3-pos': { value: new Vec2( wallUnit * 3, 0 ) },

					'side0-angle': { value: Math.PI / 2 * 0 },
					'side1-angle': { value: Math.PI / 2 * 1 },
					'side2-angle': { value: Math.PI / 2 * 2 },
					'side3-angle': { value: Math.PI / 2 * 3 },
				} ) );

				// shoot  
  				let v = Vec2.fromPolar( index * Math.PI / 2 + Math.PI / 4, 1 );
				this.shell.applyTransform( v, 0.0, { angleOnly: true } );
				v.scale( Math.random() * 100 + 200 );
				v.add( this.pos );

  				this.anim.pushFrame( new AnimFrame( {
  					'wait': { value: 0, expireOnCount: 2000 }
  				}, [
  					new FuncCall<typeof this.shootBomb>( this, 'shootBomb', [v, 4000] )
  				] ) );

  				this.anim.pushFrame( new AnimFrame( {
  					'wait': { value: 0, expireOnCount: 500 }
  				} ) );

				// move sides outward (radius) and away (angle)
				this.anim.pushFrame( new AnimFrame( {
					'side0-pos': { value: new Vec2( wallUnit * 3.5, 0 ) },
					'side1-pos': { value: new Vec2( wallUnit * 3.5, 0 ) },
					'side2-pos': { value: new Vec2( wallUnit * 3.5, 0 ) },
					'side3-pos': { value: new Vec2( wallUnit * 3.5, 0 ) },

					'side0-angle': { value: angleTargets[0] },
					'side1-angle': { value: angleTargets[1] },
					'side2-angle': { value: angleTargets[2] },
					'side3-angle': { value: angleTargets[3] },
				} ) );
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