export let levelDataList = [
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "1-1",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					 51,50,50,51, 0, 0, 0,52,11, 0,
					  1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Use the arrows to move left and right',
			'There is an unstable photon to your right',
			'Touch the photon to stabilize it'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 60,
		controlMode: 0,
		comment: "1-2",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0,10, 0, 0,
					 0,11, 0, 0, 0, 0,51,50,50,51,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Your surroundings may appear heavily distorted',
			'There is an unstable photon to your left'
		],
	},
	{
		width: 20,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 120,
		controlMode: 0,
		comment: "1-3",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
					 0,50,50,50,53, 1, 0,11,51, 1, 0,11,52, 1, 0,11, 0, 0, 0, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]
			},
		],
		messages: [
			'Press A to jump',
			'Hold A to jump higher',
			'Hold A longer to jump even higher',
			'You can move while in the air',
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 120,
		controlMode: 0,
		comment: "1-4",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,10, 0, 0, 0, 0,
					 0, 0, 0, 0,51,50,50,51, 0, 0,
					 0, 0, 1, 1, 1, 1, 1, 1, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0,11, 0, 0, 0, 0, 0,
					 0, 0, 1, 1, 1, 1, 1, 1, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Press B to use the transponder. The transponder indicates photon locations',
			'The transponder will recharge after 10 seconds'
		],
		changelog: [
			'6/8/2024: added second layer so that players can\'t stumble into the solution'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 90,
		controlMode: 0,
		comment: "1-5",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,50,50, 0, 0, 0, 0, 0,11, 0,
					  1, 1, 1, 1,51,51, 1, 1, 1, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: [
			'Watch out for pits',
			'You fell down a pit'
		],
		changelog: [
			'6/8/2024: removed safety zone at bottom'
		]
	},
	{
		width: 16,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 90,
		controlMode: 0,
		comment: "1-6",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,50,50, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0,11, 0,
					  1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: [
			'Here there are two pits in a row'
		],
	},
	{
		width: 13,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "1-7",

		layers: [
			{
				name: "spawn",
				data:  
					[0,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
					50,50,50, 0, 0, 0, 0, 0, 0, 0, 0,11, 0,
					 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1]
			},
		],
		messages: [
			'This pit has a bridge floating over it'
		],
		changelog: [
			'6/8/2024: lengthened bridge so that it doesn\'t appear to the player that they can almost make the bottom jump'
		]
	},
	{
		width: 11,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 210,
		controlMode: 0,
		comment: "1-8",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
					 0, 0, 0,51,51, 0, 0, 0, 0, 0, 0,
					10, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0,
					50,50, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			},
		],
		messages: [
			"There\'s a lady who\'s sure all that glitters is gold...",
		],
		changelog: [
			'6/8/2024: removed bottom section as it was unclear to players whether it represented progress'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 210,
		controlMode: 0,
		comment: "1-9",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0,11, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 1, 1, 0, 0, 1, 1, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,50,50, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Some things appear just out of reach'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 180,
		controlMode: 0,
		comment: "1-10",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0,10, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,50,50, 0, 0, 0,
					 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
					11, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 0, 0, 0, 0, 0, 0, 1, 1,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
					11, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]
			},
		],
		messages: [
			'This is the largest area yet'
		],
		changelog: [
			'6/8/2024: extended bottom platforms so player can\'t fall through from the start'
		]
	},
	{
		width: 5,
		height: 20,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "2-1",

		layers: [
			{
				name: "spawn",
				data:
					[0, 0,10, 0, 0,
					 0, 0,50, 0, 0,
					 0,51, 1,52, 0, 
					 0,51, 1,52, 0,
					 0,51, 1,52, 0,
					 0,51, 1,52, 0,
					 0,51, 1,52, 0, 
					 0, 0,53, 0, 0,
					 0, 0, 1, 0, 0,
					 0, 0, 1, 0, 0,
					 0, 0, 1, 0, 0, 
					 0, 0, 1, 0, 0,
					 0, 0, 1, 0, 0,
					 0, 0,11, 0, 0,				
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0]
			},
		],
		messages: [
			"When falling, you can slow your descent by moving toward a wall",
			"Hold Right to skid!",
			"Hold Left to skid!",
			"Nice!"
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "2-2",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
					 11, 0, 0, 0, 0, 0, 0, 0, 0, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
					  0, 1, 1, 1, 1, 1, 1, 0, 0, 1,
					  0, 0, 0, 0, 0, 0,51, 0, 0, 1,
					 10, 0, 0, 0, 0, 0,51, 0, 0, 1,
					 50,50, 0, 0, 0, 0,51, 0, 0, 1,
					  1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			"To jump off a wall, first skid down it, then release the direction and jump",
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "2-3",

		layers: [
			{
				name: "spawn",
				data:  
					[ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 0, 0, 0, 0, 0,11, 0, 0, 0,
					  1, 0, 0, 1, 1, 1, 1, 1, 1, 1,
					  1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					 10, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					 50,50, 0, 0, 1, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
			},
		],
		messages: [
			"Any number of wall jumps can be chained together"
		]
	},
	{
		width: 23,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "2-4",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
					10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					50,50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,]
			},
		],
		messages: [
			"That\'s impossible, even for a computer!"
		]
	},
	{
		width: 20,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "2-5",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
					  1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  1, 0,10, 0, 0, 0, 0, 1, 0, 0, 0, 0,11, 0, 1, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: []
	},
	{
		width: 10,
		height: 20,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "2-10",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0,11, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 1, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 1, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 1, 0, 0,
					 50,50, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 0, 0, 0, 0, 0, 0, 0]
			},
		],
		messages: []
	},
	{
		width: 5,
		height: 30,
		tilewidth: 30,
		tileheight: 30,
		hue: 270,
		controlMode: 0,
		comment: "2-7",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0,10, 0, 0,
				     0, 0,50,50, 0,
					 0, 1, 1, 1, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,

					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,

					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0,11, 0, 0,
					 1, 1, 1, 1, 1]
			},
		],
		messages: []
	},
	{
		width: 20,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "2-8",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 1, 0,11, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0,11, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0,11, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0,]
			},
		],
		messages: []
	},
	{
		width: 11,
		height: 11,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "2-9",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0,
					  0, 0,10, 0, 0, 0, 0, 0, 0, 0, 0,
				      0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1,
					  0, 0, 0,11, 1, 0, 1,11, 1, 0, 0,
					  1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0,
					  0, 0, 1,11, 1, 0, 1,11, 0, 0, 0,
					  1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0]
			},
		]
	},

	{
		width: 4,
		height: 16,
		tilewidth: 30,
		tileheight: 30,
		hue: 270,
		controlMode: 0,
		comment: "2-6",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0,
					 0,11, 0, 0,
					 0, 0, 0, 0,
					 1, 0, 0, 1,
					 1, 0, 0, 1,
					 1, 0, 0, 1,
					 0, 0, 0, 0,
					 1, 0, 0, 1,
					 1, 0, 0, 1,
					 1, 0, 0, 1,
					 0, 0, 0, 0,
					 1, 0, 0, 1,
					 1, 0, 0, 1,
					 1,10, 0, 1,
					 0,50,50, 0,
					 1, 1, 1, 1,]
			},
		],
		messages: []
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-1",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					 51,50,50,51, 0, 0, 0,52,11, 0,
					  1, 1, 1, 2,12, 0, 2, 1, 1, 1,
					  0, 0, 0, 0, 0, 0, 0, 0,11, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: [
			"GRAVITATIONAL ANOMALY DETECTED"
		]
	},
	{
		width: 16,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 210,
		controlMode: 0,
		comment: "3-2",

		layers: [
			{
				name: "spawn",
				data:  
					[10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 50,50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2,12, 0, 2, 1]
			},
		],
		messages: [],
		changelog: []
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-3",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 2,12, 0, 2, 1, 1, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 0, 0, 1, 1, 1, 0,
					  0,11, 0, 0, 0, 0, 0,11, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: []
	},
	{
		width: 10,
		height: 16,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-4",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0,11, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 2,12, 0, 2, 1, 1, 1,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
			},
		],
		messages: []
	},
	{
		width: 20,
		height: 16,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-5",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2,12, 0, 2, 1, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 2,12, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: []
	},
	{
		width: 10,
		height: 12,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-7",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0,11, 0, 0, 0,
					  0, 0, 0, 0, 1, 1, 1, 1, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0,13, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0,10, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 1, 1, 1, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: [],
		changelog: [
			"9/24/2024: removed 3 photons since it felt repetitive"
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-7",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0,11, 0, 0,
					  0, 0, 0, 1, 1, 1, 1, 1, 0, 1,
					  0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 1, 0, 0,
					  0, 0, 1, 2,12, 0, 2, 1, 0, 0,
					  0, 0, 1, 0,10, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
					  0, 0,11, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: []
	},
	{
		width: 10,
		height: 31,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-3",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0,13, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0,11,11,11,11,11, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0,10, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0,13, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 1, 0, 0, 0, 0, 0,]
			},
		],
		messages: []
	},
	{
		width: 10,
		height: 58,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "3-8",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0,10, 0, 0, 0, 0,

					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0,11, 0, 1, 1, 0,11, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,					  
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,					  
					  0, 0, 1, 2,12, 0, 2, 1, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,					  
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0,11, 0, 0, 0, 0,11, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			},
		],
		messages: []
	},
	{
		width: 10,
		height: 16  ,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "3-9",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0,11, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 2,12, 0, 2, 1, 0,
					 10, 0, 0, 0, 2, 0, 0, 0, 0, 0,
					  1, 2,12, 0, 2, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			},
		]
	},
]