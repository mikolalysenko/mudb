import { MuClient, MuServer } from 'mudb';
import path = require('path');
import temp = require('temp');
import fs = require('fs');
import budo = require('budo');

export enum MUDO_SOCKET_TYPES {
    LOCAL = 0,
    WEBSOCKET = 1,
}

type ClientTemplateSpec = {
    clientPath:string,
    serverPath:string,
    socketType:MUDO_SOCKET_TYPES,
    socketPort?:number,
};

function clientTemplate (spec:ClientTemplateSpec) {
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
    sessionId: Math.round(1e12 * Math.random()).toString(32),
    server: socketServer
});
`;
    }

    function generateWebSocket() {
        return `
var MuWebSocket = require('${NODE_MODULES}/muweb-socket').MuWebSocket;
var socket = new MuWebSocket({
    sessionId: Math.round(1e12 * Math.random()).toString(32),
    url: 'ws://' + window.location.hostname + ':${spec.socketPort}/socket',
});
`;
    }

    function generateSocket () {
        switch (spec.socketType) {
            case MUDO_SOCKET_TYPES.LOCAL:
                return generateLocal();
            case MUDO_SOCKET_TYPES.WEBSOCKET:
                return generateWebSocket();
        }
    }

    return `
var MuClient = require('${NODE_MODULES}/mudb/client').MuClient;
var createClient = require('${spec.clientPath}');

${generateSocket()}

var client = new MuClient(socket);
createClient(client);
`;
}

function serverTemplate (spec:{
    serverPath:string,
    socketType:MUDO_SOCKET_TYPES,
    socketHost:string,
    socketPort:number,
}) {

}

// live reload server
// should support loading/client server from scripts
//
//  + local mode
//  + websocket mode
//

export type MudoSpec = {
    // path to client module
    client:string,

    // path to server module
    server:string,

    // socket type
    socket?:MUDO_SOCKET_TYPES,
    socketPort?:number,

    // network
    port?:number,
    host?:string,
    cors?:boolean,
    ssl?:boolean,
    cert?:string,

    // budo stuff
    open?:boolean,
};

export function createMudo (spec:MudoSpec) {
    const socketType = spec.socket || MUDO_SOCKET_TYPES.LOCAL;

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
            const clientModuleSpec:ClientTemplateSpec = {
                clientPath: path.resolve(spec.client),
                serverPath: path.resolve(spec.server),
                socketType,
            };
            if (socketType === MUDO_SOCKET_TYPES.WEBSOCKET) {
            }
            const clientModule = clientTemplate(clientModuleSpec);
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

                        const budoServer = budo(info.path, budoSpec);

                        /*
                        if (spec.socketType === MUDO_SOCKET_TYPES.WEBSOCKET) {
                            // create server bundle, attach to server

                            temp.
                        }
                        */
                    });
                });
        });
}