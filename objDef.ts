import { addClass, constructors } from './lib/juego/constructors.js'
import { empty as juegoEmpty } from './lib/juego/objDef.js'

import { Bullet, PlayerBullet, Gutter } from './Bullet.js'
import { CenteredEntity } from './CenteredEntity.js'
import { Coin } from './Coin.js'
import { Explosion } from './Explosion.js'
import { Level } from './Level.js'
import { Player } from './Player.js'
import { Orbiter, Blocker, Elevator, Tumbler, Door} from './TutorialEntity.js'
import { Attack, RollBoss, Gun, Barrier, Balloon, Roller } from './RollBoss.js'
import { LockBoss, LockBossBarrier, LockWall, LockBulb,
		 LockJaw, LockBarrage, LockRing } from './LockBoss.js'

let juegoEmpty2 = juegoEmpty;
export let empty = 0; // export so that webpack doesn't ignore the file

addClass( 'Level', Level );
addClass( 'Player', Player );
addClass( 'Coin', Coin );
addClass( 'CenteredEntity', CenteredEntity );
addClass( 'RollBoss', RollBoss ); // could have loops if I decide to set .parent for Entities
addClass( 'Gun', Gun );
addClass( 'Bullet', Bullet );
addClass( 'Explosion', Explosion );
addClass( 'Barrier', Barrier );
addClass( 'Gutter', Gutter );
addClass( 'LockBoss', LockBoss );
addClass( 'LockBossBarrier', LockBossBarrier );
addClass( 'LockWall', LockWall );
addClass( 'LockBulb', LockBulb );
addClass( 'LockJaw', LockJaw );
addClass( 'LockBarrage', LockBarrage );
addClass( 'LockRing', LockRing );
addClass( 'Balloon', Balloon );
addClass( 'Roller', Roller );
addClass( 'Attack', Attack );
addClass( 'Orbiter', Orbiter );
addClass( 'Blocker', Blocker );
addClass( 'Elevator', Elevator );
addClass( 'Tumbler', Tumbler );
addClass( 'Door', Door );
addClass( 'PlayerBullet', PlayerBullet );

// define special constructors here
// constructors[className] =  () => new Class( false );