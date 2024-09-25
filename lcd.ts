import i2c from 'i2c-bus'

let bus: i2c.I2CBus;

if ( typeof document === 'undefined' ) {
	bus = i2c.openSync( 1 );
	console.log( 'i2c addresses on bus: ' );
	console.log( bus.scanSync() );
}

let lcdQueue: Array<LcdPacket> = [];

type LcdPacket = {
	isDataByte: boolean;
	byte: number;
};

export function clearLcdQueue() {
	lcdQueue = [];
}

export function lcdReset() {
	// set four-bit mode, 2-line mode
	// 0, 0, 1, data length=0, lines=1, font=0, X, X  
	sendLcdByte( false, 0x28 );

	// turn display on, turn cursor on, set cursor to blink
	// 0, 0, 0, 0, 1, display=1, cursor=1, blink=1
	sendLcdByte( false, 0x0f ); // set four-bit mode, 2 line mode (upper), [0, 0, 1, data length=0]
}

export function sendLcdByte( isDataByte: boolean, byte: number ) {
	lcdQueue.push( { isDataByte: isDataByte, byte: byte } );
}

export function lcdPrint( str: string ) {
	sendLcdByte( false, 0x01 ); // clear
	sendLcdByte( false, 0x02 ); // return

	for ( let i = 0; i < str.length; i++ ) {
		sendLcdByte( true, str.charCodeAt( i ) );
	}
}

setInterval( () => {
	if ( lcdQueue.length == 0 ) return;

	let packet = lcdQueue.shift();

	let config = 0x08 | ( packet.isDataByte ? 0x01 : 0x00 ); 
	let latch = 0x04;

	let upperNib = ( packet.byte & 0xf0 );
	let lowerNib = ( packet.byte & 0x0f ) << 4;

	bus.i2cWriteSync( 0x27, 3, Buffer.from( [config, upperNib | config | latch, upperNib | config] ) );
	for ( let i = 0; i < 1000; i++ ) {
		let x;
	}
	bus.i2cWriteSync( 0x27, 3, Buffer.from( [config, lowerNib | config | latch, lowerNib | config] ) );
}, 10 );