/*
multi-slice glow
this could also be accomplished by adding low-alpha shells around an object
this method requires more memory (retaining nearby hits) but less computation

let redness = 0;

for ( let entity of this.em.entities ) {
	if ( entity instanceof Coin ) {
		let floaterPos = entity.pos.copy();
		let floaterDir = floaterPos.minus( origin ).normalize();
		let floaterDist = floaterPos.minus( origin ).length();

		// nearer objects block glow
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