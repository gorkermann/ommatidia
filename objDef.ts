import { Chrono, Anim, AnimField, AnimFrame } from './lib/juego/Anim.js'
import { Entity } from './lib/juego/Entity.js'
import { GridArea } from './lib/juego/GridArea.js'
import { Line } from './lib/juego/Line.js'
import { Material } from './lib/juego/Material.js'
import { Region } from './lib/juego/Region.js'
import { Shape } from './lib/juego/Shape.js'
import { TileArray } from './lib/juego/TileArray.js'
import { Vec2 } from './lib/juego/Vec2.js'

import { Bullet, Gutter } from './Bullet.js'
import { CenteredEntity } from './CenteredEntity.js'
import { Coin } from './Coin.js'
import { Explosion } from './Explosion.js'
import { Level } from './Level.js'
import { Player } from './Player.js'
import { RollBoss, Gun, Barrier } from './RollBoss.js'

export type Newable = { new ( ...args: any[] ): any }

let factory = ( newable: Newable ): ( () => Object ) => {
	return () => {
		let obj = new newable();
		return obj;
	}
}

// map from class names to constructors
// used to make highlightable text in instructions
export let classMap: { [ key: string ]: Newable } = {};

classMap['Vec2'] = Vec2; // no loops
classMap['Material'] = Material; // no loops
classMap['Line'] = Line; // no loops
classMap['Shape'] = Shape; // could loop via .parent but currently not stored by parent
classMap['Entity'] = Entity; // no loops
classMap['Region'] = Region; // no loops
classMap['GridArea'] = GridArea;
classMap['TileArray'] = TileArray;
classMap['Anim'] = Anim;
classMap['AnimField'] = AnimField;
classMap['AnimFrame'] = AnimFrame;
classMap['Chrono'] = Chrono;

classMap['Level'] = Level;
classMap['Player'] = Player;
classMap['Coin'] = Coin;
classMap['CenteredEntity'] = CenteredEntity;
classMap['RollBoss'] = RollBoss; // could have loops if I decide to set .parent for Entities
classMap['Gun'] = Gun;
classMap['Bullet'] = Bullet;
classMap['Explosion'] = Explosion;
classMap['Barrier'] = Barrier;
classMap['Gutter'] = Gutter;

// list of constructor functions
// (need to access static props, not sure how to define this as a type in TS, so type is vague)

// if a class is not in this list, it is instantiated as new Class()
export let constructors : { [key: string]: () => Object } = {};

constructors['RollBoss'] = () => new RollBoss( new Vec2(), false, false );

for ( let className in classMap ) {
	if ( !( className in constructors ) ) {
		constructors[className] = factory( classMap[className] );
	}
}

// create a map so constructor names can be retrieved post-obfuscation
export let nameMap: { [ key: string ]: string } = {};

for ( let className in classMap ) {
	let constr = classMap[className];

	nameMap[constr.name] = className;
}