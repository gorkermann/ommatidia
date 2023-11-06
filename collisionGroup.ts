export let MILLIS_PER_FRAME = 60;

export let REWIND_SECS = 5;

/*
	Examples:

	invisible wall: collisionGroup = COL.LEVEL/COL.ENEMY_BODY, material.alpha = 0
		set collisionMask to select whether the wall blocks player/bullets

	two part door: isGhost = true for root, set collisionGroup to COL.LEVEL for subentity door halves
	shaft of light: collisionGroup = COL.ETHEREAL
 */

export let COL = {
	USE_ROOT: 0,
	PLAYER_BODY: 1,
	PLAYER_BULLET: 2,
	ENEMY_BODY: 4,
	ENEMY_BULLET: 8,
	LEVEL: 16,
	ITEM: 32,
	ETHEREAL: 64,
}