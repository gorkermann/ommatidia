[
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
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  1, 0, 0, 0,11, 0, 0, 0, 0, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0,10, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0,11, 0,
					  1, 1, 1, 1,40, 0, 1, 1, 1, 1,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,]
			},
		],
		messages: [
			'We\'re having trouble getting a spatial lock on your position',
			'Please imagine a cube. Do not allow the cube to extrude into 4-space'
		],
		platforms: [
			{
				width: 2,
				velY: -1,
				limitY: -6,
			}
		]
	}
]