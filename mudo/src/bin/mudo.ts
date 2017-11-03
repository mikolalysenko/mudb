import createMudo from '../mudo';
import minimist = require('minimist');

const argv = minimist(process.argv.slice(2));

if (!('client' in argv)) {
    throw new Error('must specify client');
}
if (!('server' in argv)) {
    throw new Error('must specify server');
}

const budoSpec:{
    // path to client module
    client:string,

    // path to server module
    server:string,

    // network
    port?:number,
    host?:string,
    cors?:boolean,
    ssl?:boolean,
    cert?:string,

    // budo stuff
    open?:boolean,
} = {
    client: argv.client,
    server: argv.server,
};

if ('port' in argv) {
    budoSpec.port = argv.port | 0;
}
if ('host' in argv) {
    budoSpec.host = argv.host;
}
if ('cors' in argv) {
    budoSpec.cors = !!argv.cors;
}
if ('ssl' in argv) {
    budoSpec.ssl = !!argv.ssl;
}
if ('cert' in argv) {
    budoSpec.cert = argv.cert;
}
if ('open' in argv) {
    budoSpec.open = argv.open;
}

createMudo(budoSpec);