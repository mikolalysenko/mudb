import { MuClient, MuServer } from 'mudb';
import path = require('path');
import temp = require('temp');
import fs = require('fs');
import budo = require('budo');

function clientTemplate (spec:{
    clientPath:string,
    serverPath:string,
}) {
    const NODE_MODULES = path.resolve(__dirname, 'node_modules');

    function generateLocal() {
        return `
var MuServer = require('${NODE_MODULES}/mudb/server').MuServer;
var createServer = require('${spec.serverPath}');
var muLocalSocket = require('${NODE_MODULES}/mulocal-socket');

var socketServer = muLocalSocket.createLocalSocketServer();
var server = new MuServer(socketServer);
createServer(server);

var socket = muLocalSocket.createLocalSocket({
    sessionId: Math.round(1e9 * Math.random()).toString(32),
    server: socketServer
});
`;
    }

    return `
var MuClient = require('${NODE_MODULES}/mudb/client').MuClient;
var createClient = require('${spec.clientPath}');

${generateLocal()}

var client = new MuClient(socket);
createClient(client);
`;
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
}) {
    const tracker = temp.track();
    temp.open(
        {
            prefix: 'mudo-client',
            suffix: '.js',
        },
        (err, info) => {
            if (err) {
                return console.error(err);
            }
            const clientModule = clientTemplate({
                clientPath: path.resolve(spec.client),
                serverPath: path.resolve(spec.server),
            });
            console.log(`writing client module ${info.path}`);
            console.log(clientModule);
            fs.write(
                info.fd,
                clientModule,
                (writeErr) => {
                    if (writeErr) {
                        return console.error(writeErr);
                    }
                    fs.close(info.fd, (closeErr) => {
                        if (err) {
                            return console.error(closeErr);
                        }
                        console.log('starting budo: ', info.path);

                        const budoSpec = {
                            live: false,
                            debug: true,
                            forceDefaultIndex: true,
                            errorHandler: true,
                            verbose: true,
                            stream: process.stdout,
                            ...spec,
                        };

                        budo(info.path, budoSpec);
                    });
                });
        });
}

export default createMudo;