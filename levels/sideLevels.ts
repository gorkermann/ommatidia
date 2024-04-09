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
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0,10, 0, 0, 0, 0, 0, 0,11, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		drawNormal: true,

		waves: [
			[
				{ pos: { x: 0, y: -200 }, vel: { x: 0, y: 5 } },
				{ pos: { x: 60, y: -200 }, vel: { x: 0, y: 5 } },
				{ pos: { x: 120, y: -200 }, vel: { x: 0, y: 5 } },
				{ pos: { x: 180, y: -200 }, vel: { x: 0, y: 5 } },
				{ pos: { x: 240, y: -200 }, vel: { x: 0, y: 5 } },
			],
			[
				{ pos: { x: 400, y: 67 }, vel: { x: -5, y: 0 } },
				{ pos: { x: 450, y: 67 }, vel: { x: -5, y: 0 }, coin: true },
				{ pos: { x: 500, y: 67 }, vel: { x: -5, y: 0 } }
			],
			[
				{ pos: { x: 400, y: 67 }, vel: { x: -5, y: 0 } },
				{ pos: { x: 400, y: 37 }, vel: { x: -5, y: 0 }, coin: true },
				{ pos: { x: 400, y: 7 }, vel: { x: -5, y: 0 } }
			],
			[
				{ pos: { x: -200, y: 67 }, vel: { x: 5, y: 0 }, stack: 5 }
			],
			[
				{ pos: { x: -200, y: 67 }, vel: { x: 5, y: 0 }, stack: 5 }
			],
			[
				{ pos: { x: -200, y: 67 }, vel: { x: 5, y: 0 }, stack: 5 }
			],
			[
				{ pos: { x: -200, y: 67 }, vel: { x: 5, y: 0 }, stack: 5 }
			],
			[
				{ pos: { x: 400, y: 67 }, vel: { x: -5, y: 0 } }
			],
			[
				{ pos: { x: -200, y: 67 }, vel: { x: 5, y: 0 } }
			],
			[
				{ pos: { x: -200, y: 67 }, vel: { x: 5, y: 0 }, stack: true }
			],
			[
				{ pos: { x: 400, y: 67 }, vel: { x: -3, y: 0 }, coin: true }
			],
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
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0,10, 0, 0,11, 0,11, 0,11, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		],
		drawNormal: true,
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
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					 0,10, 0, 0, 0, 0, 0, 0,11, 0,
					 1, 1, 1, 1, 0, 0, 1, 1, 1, 1,
					 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
			},
		],
		drawNormal: true,
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
					[1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
					 1, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 0,10, 0, 0, 1, 0, 0, 0, 0,
					 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
			},
		]
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
					 0, 0, 0, 1, 1, 1, 1, 0, 0, 0,
					 0,10, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 1, 1, 1, 0, 0, 0, 0, 1, 1]
			},
		]
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
					[0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					10, 0, 0, 0, 0, 0, 0, 0, 0,11,
					 1, 0, 1, 0, 0, 1, 0, 0, 0, 1,
					 0, 1, 0, 1, 1, 0, 0, 0, 0, 0]
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
]