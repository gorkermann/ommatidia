export let levelDataList = [
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,

		layers: [
			{
				name: "spawn",
				data:  
					[52,52,52,52,52,52,52,52,52,52,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					 51,50,50,51, 0, 0, 0, 0,11, 0,
					  1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		drawNormal: true,
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

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					 0,50,50, 0,11, 0,11, 0,11, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		drawNormal: true,
		messages: [
			`Your surroundings may appear heavily distorted`
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 90,
		controlMode: 0,

		layers: [
			{
				name: "spawn",
				data:  
					[ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					 51,50,50,51, 0, 0, 0, 0,11, 0,
					  1, 1, 1, 1, 0, 0, 1, 1, 1, 1]
			},
		],
		drawNormal: true,
		messages: [
			'We\'re having trouble getting a spatial lock on your position',
			'Please imagine a cube. Do not allow the cube to extrude into 4-space'
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 120,
		controlMode: 0,

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0,10, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 1, 0, 0, 0,11,
					 0, 0,50,50, 0, 1, 0, 0, 0, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		messages: [
			'Now allow the cube to rotate about the long axis of your body'
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 150,
		controlMode: 0,

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0,11, 0, 0, 0,
					 0,10, 0, 1, 1, 1, 1, 0, 0, 0,
					 0,50,50, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 1, 1, 0, 0, 0, 0, 1, 1]
			},
		],
		messages: [
			'Great, we have your position to within  100,000,000 meters'
		],
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 180,
		controlMode: 0,

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0,10, 0, 0, 0, 0,
					 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
					11, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 0, 0, 0, 0, 0, 0, 1, 1,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
					11, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 0, 0, 0, 0, 0, 0, 1, 1]
			},
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 210,
		controlMode: 0,

		layers: [
			{
				name: "spawn",
				data:  
					[0, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 1, 1, 0, 0, 0, 0, 0,
					10, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]
			},
		]
	},
	{
		width: 10,
		height: 10,
		tilewidth: 30,
		tileheight: 30,
		hue: 210,
		controlMode: 0,

		layers: [
			{
				name: "spawn",
				data:  
					[ 0,11, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 1, 1, 0, 0, 1, 1, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 1, 1, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
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
					[0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					10, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 0, 0, 0, 0, 0, 0, 0, 0, 1]
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

		layers: [
			{
				name: "spawn",
				data:  
					[0,11, 0,11, 0,
					 0, 0, 1, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0,11, 0, 0,
					 0, 0, 1, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0,10, 0, 0,
					 0, 0, 1, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0,11, 0, 0,
					 0, 0, 1, 0, 0,
					 0, 0, 0, 0, 0,
					 0, 0,11, 0, 0,
					 0, 0, 1, 0, 0,
					 0, 0,11, 0, 0,
					 0, 1, 1, 1, 0]
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
					 1, 0, 0, 1,
					 0,10, 0, 0,
					 1, 1, 1, 1,]
			},
		]
	},
]