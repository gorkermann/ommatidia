export let MILLIS_PER_FRAME = 60;

export let REWIND_SECS = 5;

/*
	Examples:

	INVISIBLE WALL
		collisionGroup = COL.LEVEL/COL.ENEMY_BODY, material.alpha = 0
		set collisionMask to select whether the wall blocks player/bullets

	TWO PART DOOR (opens and closes)
		root
			collisionGroup doesn't matter
			isGhost = true

		children (doors)
			collisionGroup = COL.LEVEL
	
	SHAFT OF LIGHT
		collisionGroup = COL.ETHEREAL
 */

export let COL = {
	USE_ROOT: 0, // shouldn't be used for entities with no parent TODO: make test for this
	PLAYER_BODY: 1,
	PLAYER_BULLET: 2,
	ENEMY_BODY: 4,
	ENEMY_BULLET: 8,
	LEVEL: 16,
	ITEM: 32,
	ETHEREAL: 64,
}