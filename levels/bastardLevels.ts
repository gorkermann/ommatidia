[
	{	
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 0,
		controlMode: 0,
		comment: "oh no, there's wall jumping",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0,10, 0, 0, 0, 0, 0, 0, 0, 1,
					  1, 1, 1, 1, 1, 1, 1, 1, 0, 1,
					  1, 0, 0, 0, 1, 0, 0, 0, 0, 1,
					  1, 0, 1, 0, 0, 0, 1, 0, 0, 1,
					  1, 0, 1, 1, 1, 1, 1, 1, 1, 1,
					  1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
					  1, 0, 0, 0, 0, 0, 0, 0,11, 1,
					  1, 1, 0, 1, 1, 1, 1, 0, 1, 1]
			},
		]
	},
	{
		width: 5,
		height: 16,
		tilewidth: 30,
		tileheight: 30,
		hue: 270,
		controlMode: 0,
		comment: "hi dive 2",

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0,10, 0, 0,
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
					 0, 0,11, 0, 0,
					 1, 1, 1, 1, 1]
			},
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 240,
		controlMode: 0,
		comment: "an ancient symbol",

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0,10, 0, 0, 0, 0, 0, 0, 0,
				      0, 0, 1, 0, 0, 1, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 0, 1, 1, 1, 0, 1, 0, 1, 0,
					  0, 0, 0,11, 1,11, 1, 0, 0, 0,
					  0, 0, 1, 1, 1, 1, 1, 0, 0, 0,
					  0, 0, 1,11, 1,11, 0, 0, 0, 0,
					  1, 0, 1, 0, 1, 1, 1, 0, 1, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
			},
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
					[ 0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,50,50, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1,51, 0, 0, 0, 0, 0,
					  1, 0, 0, 1,51, 0, 0, 0, 0, 1,
					  1, 0, 0, 1,51, 0, 0, 0, 0, 1,
					  1, 0, 0, 1,51, 0, 0, 0, 0, 1,
					  1,11, 0,52, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 0, 0, 0, 0, 0, 0]
			},
		],
		messages: [
			"When falling, you can slow your descent by moving toward a wall",
			"Hold Left to skid!",
			"Nice!"
		]
	},
]