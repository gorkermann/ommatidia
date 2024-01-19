let cookie: string = null;

export class ServerInterface {
	constructor() {}

	static listDir = function( path: string='' ): Promise<Array<string>> {
		return;
	}

	static post = function( requestname: string, obj: any={}, responseType: string='' ): Promise<string> {
		return;
	}

	static postJSON = function( requestname: string, obj: any={} ): Promise<Object> {
		return;
	}
}

export class XhrInterface extends ServerInterface {
	constructor() { super() }	

	static listDir = function( path: string='' ): Promise<Array<string>> {
		return XhrInterface.postJSON( '/dev/readdir', { dirname: path } ) as Promise<Array<string>>;
	}

	static post = function( requestname: string, obj: any={}, responseType: string='' ): Promise<string> {
		return new Promise( function ( resolve, reject ) {
			let xhr = new XMLHttpRequest();

			// set headers
			let data = JSON.stringify( obj );
			let headers: { [key: string]: string } = { 'Content-Type': 'text/plain;charset=UTF-8' };

			if ( obj instanceof Object ) {
				headers['Content-Type'] = 'application/json';
			}

			// send
			xhr.open( 'POST', 'http://10.42.0.138:5000/' + requestname, true );

			xhr.responseType = responseType as XMLHttpRequestResponseType;
			xhr.setRequestHeader( 'Content-Type', headers['Content-Type'] );
			if ( cookie !== null ) {
				xhr.setRequestHeader( 'Cookie', cookie );
			}

	        xhr.onload = function() {
	            if ( xhr.status >= 200 && xhr.status < 300 ) {
	            	resolve( xhr.response );	               
	            } else {
	                reject( xhr.statusText );
	            }
	        };	    
	        xhr.onerror = function() {
	        	reject( requestname + ' failed:' + xhr.statusText );	
	        };
			
			xhr.send( data );
		} );
	}

	static postJSON = function( requestname: string, obj: any={} ): Promise<Object> {
		return XhrInterface.post( requestname, obj )
		.then( function( response: string ) {
			if ( response == '' ) {
				return {};
			} else {
				let json = {};

				try {
					json = JSON.parse( response );
				} catch ( ex ) {
					console.error( ex );
				}

				return json;
			}
		} );
	}
}

/* untested
	static get = function( requestname: string, responseType: string='' ): Promise<string> {
		return new Promise( function ( resolve, reject ) {
			let xhr = new XMLHttpRequest();

			xhr.open( 'GET', './' + requestname, true );
			xhr.responseType = responseType as XMLHttpRequestResponseType;

	        xhr.onload = function() {
	            if ( xhr.status >= 200 && xhr.status < 300 ) {
	            	resolve( xhr.response );	               
	            } else {
	                reject( xhr.statusText );
	            }
	        };	    
	        xhr.onerror = function() {
	        	reject( xhr.statusText );	
	        };
			
			xhr.send();
		} );
	}*/