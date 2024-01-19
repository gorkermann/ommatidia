const express = require('express');
const bodyParser = require('body-parser');
const ws281x = require('rpi-ws281x-native');

const rpio = require( 'rpio' );


const process = require('process');

if ( !process.env.SUDO_UID ) {
    console.error( '[ommatidia-server] Must run as root to satisfy ws281x' );
    process.exit( 1 );
}

let channel = ws281x(144, { stripType: 'ws2812', gpio: 18 });

//let appRoot = '..';
//let fileRoot = path.join(appRoot, '/files');

let mins = [
  0x010000,
  0x010100,
  0x010101,
  0x000101,
  0x000001,
  0x010001,
];

let posX = 0;

let log_red = console.log;
let log_yellow = console.log;

let counter = 0;
function updateCounter() {
    counter++;
    counter %= 1000;

    return counter;
}
class ReqData {
    constructor(id, name, obj) {
        this.expectFail = false;
        this.preamble = id + ' ' + name;
        this.obj = obj;
        if (obj) {
            this.expectFail = obj.expectFail;
        }
    }
    checkArgs(res, obj, args) {
        let missingArgs = [];
        for (let arg of args) {
            if (!obj || !(arg in obj)) {
                missingArgs.push(arg);
            }
        }
        if (missingArgs.length > 0) {
            if (this.expectFail) {
                log_yellow(this.preamble + ': missing arguments ' + missingArgs);
            }
            else {
                log_red(this.preamble + ': missing argument ' + missingArgs);
            }
            res.status(500).send();
            return true;
        }
        return false;
    }
    traversalCheck(res, filepath) {
        let names;
        if (filepath instanceof Array) {
            names = filepath;
        }
        else {
            names = [filepath];
        }
        for (let name of names) {
            if (name.indexOf(fileRoot) != 0) {
                if (this.expectFail) {
                    log_yellow(this.preamble + ' traversing out of file root to ' + name);
                }
                else {
                    log_red(this.preamble + ' traversing out of file root to ' + name);
                }
                res.status(500).send();
                return true;
            }
        }
        return false;
    }
    fileError(str, res, error) {
        if (this.expectFail) {
            log_yellow(this.preamble + ' ' + str + ': ' + error);
        }
        else {
            log_red(this.preamble + ' ' + str + ': ' + error);
        }
        if (error && error.code == 'ENOENT') {
            res.status(404).send();
        }
        else {
            res.status(500).send();
        }
    }
}

let appRoutes = express.Router();
appRoutes.post('/move', async function (req, res) {
    let id = updateCounter();
    let obj = req.body;
    let reqData = new ReqData(id, '/move', obj);
    if (reqData.checkArgs(res, obj, ['x', 'y']))
        return;

    console.log( id + ' /move OK ' + obj.x + ' ' + obj.y );

    posX += Math.floor( obj.x );
    if ( posX < 0 ) posX += 144;

    for ( let i = 0; i < 144; i++ ) {
        channel.array[i] = 0;
    }

    for (let i = 0; i < 10; i++) {
        channel.array[( ( posX + i % 144 ) + 144 ) % 144 ] = mins[0] * 10;
    }
    ws281x.render(); 

    res.status(200).send();
});

appRoutes.post('/color', async function (req, res) {
    let id = updateCounter();
    let obj = req.body;
    let reqData = new ReqData(id, '/color', obj);
    if (reqData.checkArgs(res, obj, ['color']))
        return;

    console.log( id + ' /color OK ' + obj.color );

    for (let i = channel.array.length - 1; i >= 10; i--) {
        channel.array[i] = channel.array[i - 10];
    }

    for (let i = 0; i < 10; i++) {
        channel.array[i] = obj.color;
    }
    ws281x.render(); 

    res.status(200).send();
});

appRoutes.post('/render', async function (req, res) {
    let id = updateCounter();
    let obj = req.body;
    let reqData = new ReqData(id, '/render', obj);
    if (reqData.checkArgs(res, obj, ['slices']))
        return;

    console.log( id + ' /render OK ' + obj.slices.length );

    for ( let i = 0; i < channel.array.length; i++ ) {
        channel.array[i] = 0;
    }
    for (let i = 0; i < channel.array.length; i++) {
        channel.array[i] = obj.slices[i] & 0xffffff;
    }
    ws281x.render(); 

    res.status(200).send();
});

console.log('starting server... ');
let app = express();
app.set('view engine', 'ejs');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json({'limit': '50mb'}));
app.use(bodyParser.urlencoded({extended: true}));

app.use(function (req, res, next) {
    if ( req && req.body ) { 
        console.log(req.method + ' ' + req.originalUrl + ' ' + JSON.stringify(req.body).slice(0, 200));
    } else if ( req ) {
        console.log( req.method + ' ' + req.originalUrl + ' (empty body)' );
    } else {
        console.log( 'empty request' )
    }
    next();
});

app.use('/', appRoutes);
app.use('/', express.static('.'));

let port = parseInt(process.env.PORT) || 5000;
app.listen(port, () => {
    console.log('server running on port ' + port);
});

/* GPIO test */

rpio.open(15, rpio.INPUT, rpio.PULL_UP);

function pollcb(pin) {
        /*
         * Wait for a small period of time to avoid rapid changes which
         * can't all be caught with the 1ms polling frequency.  If the
         * pin is no longer down after the wait then ignore it.
         */    

        rpio.msleep(20);

        if (rpio.read(pin))
                return;

        console.log('Button pressed on pin P%d', pin);
}

rpio.poll(15, pollcb, rpio.POLL_LOW);