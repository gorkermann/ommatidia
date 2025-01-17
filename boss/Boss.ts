import { Chrono, Anim, AnimField, AnimFrame } from '../lib/juego/Anim.js'
import { Material } from '../lib/juego/Material.js'
import { Vec2 } from '../lib/juego/Vec2.js'
import { Shape } from '../lib/juego/Shape.js'
import { Sound } from '../lib/juego/Sound.js'
import { Dict } from '../lib/juego/util.js'

import { CenteredEntity } from '../CenteredEntity.js'
import { Explosion } from '../Explosion.js'

import { Attack } from './Attack.js'

import * as Debug from '../Debug.js'

export let bossBodyMaterial = new Material( 0, 1.0, 0.3 );
export let bossBodyAltMaterial = new Material( 0, 1.0, 0.5 );

export enum BossState {
	DEFAULT = 0,
	EXPLODE,
	DEAD,
	SLEEP,
}

export type BossFlags = {
	health: number;
	current_attack_damage: number;
	retreating: boolean;
}

export class Boss extends CenteredEntity {
	invuln: boolean = false;
	health: number = 20;
	maxHealth: number; // need to set in constructor

	watchTarget: Vec2 = null; // relative to this.pos

	alpha: number = 1.0;

	coreMaterial = new Material( 30, 1.0, 0.5 );
	whiteMaterial = new Material( 0, 0.0, 1.0 );
	pupilMaterial = new Material( 0, 0.0, 0.0 );

	state: number = BossState.DEFAULT;
	flags: BossFlags = {
		health: 0,
		current_attack_damage: 0,
		retreating: false,
	}

	attacks: Array<Attack> = [];
	attack: Attack = null;
	counter: Attack = null;

	overrideAttackField = '';

	messages: Array<string> = [];

	blink: number = 0.0; // 0.0 - 1.0;
	eyeStrain: number = 0.0;
	eyeAngle: number = 0;
	canBlink: boolean = true;

	counts: Dict<Chrono> = {
		'attention': new Chrono( 0, 5000 ),
		'blink': new Chrono( 0, 3000 ),
		'explode': new Chrono( 0, 500 )
	}

	eyeAnim = new Anim( {
		'blink': new AnimField( this, 'blink', 0.2 ),
		'eyeStrain': new AnimField( this, 'eyeStrain', 0.5 ),
		'eyeAngle': new AnimField( this, 'eyeAngle', 0.1, { isAngle: true } ),
		'canBlink': new AnimField( this, 'canBlink' ),
	},
	new AnimFrame( {
		'blink': { value: 0.0 },
		'eyeStrain': { value: 0.0 },
		'eyeAngle': { value: 0.0 },
		'canBlink': { value: true },
	} ) );

	sounds: Array<Sound> = [];

	constructor( pos: Vec2, width: number, height: number ) {
		super( pos, width, height );

		this.coreMaterial.emit = 0.8;
		this.whiteMaterial.emit = 0.8;

		this.flags.health = this.getHealth();
	}

	watch( target: Vec2 ) {
		this.watchTarget = target.minus( this.pos );
	}

	getOwnShapes(): Array<Shape> {
		let shapes = [];

		let core = Shape.makeCircle( new Vec2( 0, 0 ), 40, 36 );
		core.material = this.coreMaterial;
		core.parent = this;

		for ( let i = 0; i < core.points.length; i++ ) {
			core.points[i].rotate( this.eyeAngle );
			core.normals[i].rotate( this.eyeAngle );
		}

		if ( this.blink < 0.8 ) {
			core.edges[6].material = this.whiteMaterial;
			core.edges[7].material = this.whiteMaterial;//new Material( 0, 0.5, 0.4 );
			//core.points[7].rotate( Math.PI * 2 / 36 / 2 );
			core.edges[8].material = this.pupilMaterial;
			core.edges[9].material = this.pupilMaterial;
			core.edges[10].material = this.whiteMaterial;//new Material( 0, 0.5, 0.4 );
			//core.points[11].rotate( -Math.PI * 2 / 36 / 2 );
			core.edges[11].material = this.whiteMaterial;
		}

		let start = 6;
		let mid = 9;
		let max = 12;

		for ( let i = start; i <= max; i++ ) {
			
			// angle toward middle of eye
			let angle = ( mid - i ) / 36 * Math.PI * 2;
			if ( i >= mid ) angle = ( mid - i ) / 36 * Math.PI * 2;

			if ( i >= 8 && i <= 10 && this.eyeStrain > 0 ) {
				core.points[i].rotate( angle * this.eyeStrain );
			} else {
				core.points[i].rotate( angle * this.blink );
			}
		}

		let altM = new Material( 0, 1.0, 0.7 );
		for ( let i = 1; i < core.edges.length; i += 2 ) {
		//	core.edges[i].material = altM;
		}

		shapes.push( core );

		return shapes;
	}

	getBody(): Array<CenteredEntity> { return [this] };

	getHealth(): number {
		return Math.max( this.health, 0 );
	}

	updateHealthFlags() {
		let health = this.getHealth();
		
		if ( health < this.flags['health'] ) {
			this.flags['current_attack_damage'] += this.flags['health'] - health;
			this.flags['health'] = health;
		}
	}

	animate( step: number, elapsed: number ) {
		for ( let key in this.counts ) {
			this.counts[key].update( elapsed );
		}

		if ( this.counts['blink'].count <= 0 && this.canBlink ) {
			this.eyeAnim.pushFrame( new AnimFrame( {
				'blink': { value: 1.0, expireOnReach: true }
			} ) );

			this.counts['blink'].reset();
		}

		if ( this.watchTarget && this.counts['attention'].count <= 0 && this.canBlink ) {
			this.eyeAnim.pushFrame( new AnimFrame( {
				'eyeAngle': { value: this.watchTarget.angle() - Math.PI / 2, expireOnReach: true, setDefault: true }
			} ) );

			this.counts['attention'].reset();
		}

		this.eyeAnim.update( step, elapsed );
	}

	update() {
		if ( this.state == BossState.EXPLODE ) {
			this.explodeLogic();
		} else if ( this.state == BossState.DEFAULT ) {
			this.defaultLogic();
		}
	}

	damage( value: number ) {
		this.health -= value;

		if ( 'flash' in this.anim.fields ) {
			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.0, expireOnReach: true, overrideRate: 0.1 },
			} ), { threadIndex: 1, tag: 'exit' } );
			this.anim.pushFrame( new AnimFrame( {
				'flash': { value: 0.5, expireOnReach: true },
			} ), { threadIndex: 1 } );
		}

		this.doEyeStrain();

		if ( this.health <= 0 ) {
			this.kill();
		}

		this.messages.push( '!clearmsg, Enemy health:' );
		this.messages.push( 'Enemy health: ' + this.health );
	}

	kill() {
		this.doEyeDead();
		this.state = BossState.EXPLODE;

		this.messages.push( '!wipe' );

		this.anim.clear();
	}

	doLook() {
		this.counts['attention'].count = 0;
	}

	private doEyeStrain() {
		this.eyeAnim.clear();
		this.eyeAnim.pushFrame( new AnimFrame( {
			'blink': { value: 0.0, expireOnReach: true },
			//'eyeStrain': { value: 0.0 },
		} ), { tag: 'exit' } );
		this.eyeAnim.pushFrame( new AnimFrame( {
			'blink': { value: -1, expireOnCount: 500, overrideRate: 0.5 },
			'eyeStrain': { value: 0.5 },
			'canBlink': { value: false }
		} ), { tag: 'exit' } );

		this.counts['blink'].reset();
		this.counts['attention'].reset();
	}

	private doEyeDead() {
		this.eyeAnim.clear();
		this.eyeAnim.pushFrame( new AnimFrame( {
			'blink': { value: 1.0, expireOnReach: true, overrideRate: 0.04, setDefault: true },
			'eyeStrain': { value: 0.0, setDefault: true }
		} ) );
	}

	canEnter( attack: Attack ): boolean {
		return false;
	}

	chooseAttack() {
		let oldAttack = this.attack;

		if ( Debug.flags.FORCE_BOSS_ATK && Debug.fields[this.overrideAttackField] ) {
			let names = Debug.fields[this.overrideAttackField].value.split( ',' );
			let debugAttacks = this.attacks.filter( x => names.includes( x.name ) );

			if ( debugAttacks.length > 0 ) {
				let index = Math.floor( Math.random() * debugAttacks.length )
				this.attack = debugAttacks[index];

			} else {
				console.warn( 'ShellBoss.defaultLogic: no valid attacks from debug' );
			}

		} else if ( this.counter ) {
			this.attack = this.counter;
			this.counter = null;

		} else {
			let possibleAttacks = this.attacks.filter( x => this.canEnter( x ) );

			if ( this.attack && possibleAttacks.length > 1 ) {
			//	possibleAttacks = possibleAttacks.filter( x => x != this.attack );
			}

			if ( possibleAttacks.length == 0 ) {
				this.messages.push( 'The ' + this.flavorName + ' surrenders!\n' );
				this.state = BossState.DEAD;
				return;
			}

			let index = Math.floor( Math.random() * possibleAttacks.length );
			this.attack = possibleAttacks[index];
		}

		console.log( 'Beginning attack ' + this.attack.name ); // + ' (' + possibleAttacks.map( x => x.name ) + ')' );
		
		if ( !oldAttack || this.attack.name != oldAttack.name ) {
			this.flags['current_attack_damage'] = 0;
		}
		
		this.flags['retreating'] = false;

		this.anim.clear( { withoutTag: 'exit' } );
	}

	defaultLogic() {}

	explodeLogic() {
		this.counts['attention'].active = false;
		this.counts['blink'].active = false;

		if ( this.counts['explode'].count <= 0 ) {
			let entities = this.getBody();
			let i = Math.floor( Math.random() * entities.length );

			let p = ( entities[i] as CenteredEntity ).getRandomPoint();

			this.spawnEntity( new Explosion( p ) );

			this.alpha -= 0.1;
		
			if ( this.alpha <= 0 ) {
				this.state = BossState.DEAD;
			}

			this.counts['explode'].reset();
		}
	}

	preventSuccess(): boolean {
		return this.state != BossState.DEAD;
	}

	pushMessage( msg: string ) {
		this.messages.push( msg );
	}

	shade() {
		let now = new Date().getTime();

		if ( this.state == BossState.EXPLODE ) {
			this.coreMaterial.skewS = -( 1 - this.alpha );

		} else {
			this.coreMaterial.skewH = 15 * Math.sin( Math.PI * 2 * ( now % 1000 ) / 1000 );
		}

		// white of eye flashing red
		if ( this.blink < 0 ) {
			this.pupilMaterial.skewL = Math.sin( Math.PI * ( now % 200 ) / 200 );

			this.whiteMaterial.skewH = 30 * Math.sin( Math.PI * ( now % 200 ) / 200 );
			this.whiteMaterial.skewS = 1.0;
			this.whiteMaterial.skewL = -0.2 * Math.sin( Math.PI * ( now % 133 ) / 133 );
			
		// normal
		} else {
			this.pupilMaterial.skewL = 0.0;
			
			this.whiteMaterial.skewH = 0.0;
			this.whiteMaterial.skewS = 0.0;
			this.whiteMaterial.skewL = 0.0;
		}

		super.shade();
	}
}