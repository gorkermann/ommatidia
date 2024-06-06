export let levelDataList = [
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "right",

		layers: [
			{
				name: "spawn",
				data:  
					[52,52,52,52,52,52,52,52,52,52,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					 52,50,50,52, 0, 0, 0, 0,11, 0,
					  1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Use the arrows to move left and right',
			'Press A to jump',
			'There is an unstable photon nearby'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 60,
		controlMode: 0,
		comment: "left",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0,10, 0,
					 0,11, 0, 0, 0, 0, 0, 0,50,50,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			`Your surroundings may appear heavily distorted`
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 120,
		controlMode: 0,
		comment: "jumping",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0,10, 0,51,51,51, 0, 0, 0,
					 0, 0, 0, 0, 0, 1, 0, 0, 0, 0,
					 0,50,50,50, 0, 1, 0, 0,11, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Press A to jump',
			'Nice!'
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 120,
		controlMode: 0,
		comment: "transponder",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,10, 0, 0, 0, 0,
					 0, 0, 0, 0, 0,50,50, 0, 0, 0,
					 0, 0, 1, 1, 1, 1, 1, 1, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0,11, 0, 0, 0, 0, 0, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Press B to use the transponder',
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 90,
		controlMode: 0,
		comment: "safety pit",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,50,50, 0, 0, 0, 0, 0,11, 0,
					  1, 1, 1, 1, 0, 0, 1, 1, 1, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0,51,51,51,51, 0, 0, 0,
					  0, 0, 0, 1, 1, 1, 1, 0, 0, 0,]
			},
		],
		messages: [
			'Watch out for pits',
			'You fell down a pit'
		],
	},
	{
		width: 11,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,
		comment: "jump up",

		layers: [
			{
				name: "spawn",
				data:  
					[0,10, 0, 0, 0, 0,11, 0, 0, 0, 0,
					 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0,
					50,50,50, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1]
			},
		],
		messages: [
			'This pit has a bridge over it'
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 210,
		controlMode: 0,
		comment: "stairs",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					10, 0, 0, 1, 1, 0, 0, 0, 0, 0,
					50,50, 0, 0, 0, 0, 0, 0, 0, 0,
					 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Careful! The stairs here are narrow'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 210,
		controlMode: 0,
		comment: "high up",

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
		width: 5,
		height: 16,
		tilewidth: 30,
		tileheight: 30,
		hue: 270,
		controlMode: 0,
		comment: "hi dive",

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
					 0,11, 0,11, 0,
					 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Some things appear far below'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 180,
		controlMode: 0,
		comment: "explore",

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
					 1, 1, 0, 0, 0, 0, 0, 0, 1, 1]
			},
		],
		messages: [
			'This is the largest area yet'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "narrow landing zones",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 1, 1, 0, 0, 0, 0,
					10, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					50,50, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 0, 0, 0, 0, 0, 0, 1, 1]
			},
		],
		messages: [
			'That\'s impossible, even for a computer!'
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,

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
			"To jump off a wall, first skid down it, then release the arrow key and press A",
			"You can jump off the wall, or straight up"
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "oh no, there's wall jumping",

		layers: [
			{
				name: "spawn",
				data:  
					[ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 0, 0, 0, 0, 0,11, 0, 0, 0,
					  1, 0, 0, 1, 1, 1, 1, 1, 1, 1,
					  1, 0, 0, 1, 0, 0, 0, 0, 0, 0,
					 10, 0, 0, 1, 0, 0, 0, 0, 0, 0,
					 50,50, 0, 1, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 0, 0, 0, 0, 0, 0]
			},
		],
		messages: [
			"Any number of wall jumps can be chained together"
		]
	},
	{
		width: 5,
		height: 20,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,

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
		width: 4,
		height: 16,
		tilewidth: 30,
		tileheight: 30,
		hue: 270,
		controlMode: 0,

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
		messages: [
			"The last level! Go for it!"
		]
	},
]