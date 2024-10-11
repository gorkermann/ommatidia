import i2c from 'i2c-bus'

export let LCD_PACKET_INTERVAL_MS = 5;

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
	// [0, 0, 1, data length=0, lines=1, font=0, X, X]
	sendLcdByte( false, 0x28 );

	// turn display on, turn cursor on, set cursor to blink
	// [0, 0, 0, 0, 1, display=1, cursor=1, blink=1]
	sendLcdByte( false, 0x0f );
}

export function sendLcdByte( isDataByte: boolean, byte: number ) {
	lcdQueue.push( { isDataByte: isDataByte, byte: byte } );
}

/**
 * Since the LCD takes four(?) packets to send a byte, it can get out of sync
 * with regard to which packets represent the the first or second half of a byte
 * Use this function to attempt to resync by sending only half a byte
 */
export function sendLcdHalfByteForce() {
	let config = 0x08 | 0x01;
	let latch = 0x04;

	bus.i2cWriteSync( 0x27, 3, Buffer.from( [config, 0x00 | config | latch, 0x00 | config] ) );
}

export function sendLcdString( str: string ) {
	sendLcdByte( false, 0x01 ); // clear
	sendLcdByte( false, 0x02 ); // return

	for ( let i = 0; i < str.length; i++ ) {
		sendLcdByte( true, str.charCodeAt( i ) );
	}
}

let upper: boolean = true;

setInterval( () => {
	if ( lcdQueue.length == 0 ) return;

	let packet = lcdQueue[0];//shift();

	let config = 0x08 | ( packet.isDataByte ? 0x01 : 0x00 ); 
	let latch = 0x04;

	let byte = 0x0;

	if ( upper ) {
		byte = ( packet.byte & 0xf0 );
	} else {
		byte = ( packet.byte & 0x0f ) << 4;
	}

	bus.i2cWriteSync( 0x27, 3, Buffer.from( [config, byte | config | latch, byte | config] ) );
	//bus.i2cWriteSync( 0x27, 3, Buffer.from( [config, upperNib | config | latch, upperNib | config] ) );
	//bus.i2cWriteSync( 0x27, 3, Buffer.from( [config, lowerNib | config | latch, lowerNib | config] ) );

	if ( !upper ) lcdQueue.shift();

	upper = !upper;
}, LCD_PACKET_INTERVAL_MS );