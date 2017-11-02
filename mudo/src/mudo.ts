import { MuClient, MuServer } from 'mudb';
import path = require('path');
import temp = require('temp');
import fs = require('fs');
import budo = require('budo');

function clientTemplate (spec:{
    clientPath:string,
    serverPath:string
}) {
    const NODE_MODULES = path.resolve(__dirname, 'node_modules');

    function generateLocal() {
        return `
var MuServer = require('${NODE_MODULES}/mudb/server');
var createServer = require('${spec.serverPath}');
var muLocalSocket = require('${NODE_MODULES}/mulocal-socket');

var socketServer = muLocalSocket.createSocketServer();
var server = new MuServer(socketServer);
createServer(server);

var socket = muLocalSocket.createSocket({
    sessionId: Math.round(1e9 * Math.random()).toString(32),
    server: socketServer
});
`
    }

    return `
var MuClient = require('${NODE_MODULES}/mudb/client');
var createClient = require('${spec.clientPath}');

${generateLocal()}

var client = new MuClient(socket);
createClient(client);
`
}

// live reload server
// should support loading/client server from scripts
//
//  + local mode
//  + websocket mode
//

function createMudo (spec:{
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

    // browserify transform args
    debug?:boolean,
}) {
    const tracker = temp.track();
    temp.open({
        prefix: 'mudo-client',
        suffix: '.js'
    }, (err, info) => {
        if (err) {
            return console.error(err);
        }
        fs.write(info.fd, clientTemplate({
            clientPath: path.resolve(spec.client),
            serverPath: path.resolve(spec.server),
        }), (err) => {
            if (err) {
                return console.error(err);
            }
            fs.close(info.fd, (err) => {
                if (err) {
                    return console.error(err);
                }
                budo(info.path, {
                    live: false,
                    port: spec.port,
                    host: spec.host,
                    cors: spec.cors,
                    ssl: spec.ssl,
                    cert: spec.cert,
                    debug: spec.debug,
                    open: spec.open,
                    forceDefaultIndex: true,
                    errorHandler: true,
                    verbose: true,
                });
            });
        })
    });
}

export default createMudo;