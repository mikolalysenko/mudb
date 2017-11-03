import { MuClient, MuServer } from 'mudb';
import path = require('path');
import temp = require('temp');
import fs = require('fs');
import budo = require('budo');
import { MuWebSocketServer } from 'muweb-socket/server';

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
    function generateLocal() {
        return `
var MuServer = require('${require.resolve('mudb/server')}').MuServer;
var createServer = require('${spec.serverPath}');
var muLocalSocket = require('${require.resolve('mulocal-socket')}');

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
var MuWebSocket = require('${require.resolve('muweb-socket/socket')}').MuWebSocket;
var socket = new MuWebSocket({
    sessionId: Math.round(1e12 * Math.random()).toString(32),
    url: 'ws://' + window.location.host,
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
var MuClient = require('${require.resolve('mudb/client')}').MuClient;
var createClient = require('${spec.clientPath}');

${generateSocket()}

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
    const clientPath = path.resolve(spec.client);
    const serverPath = path.resolve(spec.server);

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
                clientPath,
                serverPath,
                socketType,
            };
            const clientModule = clientTemplate(clientModuleSpec);
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

                        const budoSpec = {
                            live: false,
                            debug: true,
                            forceDefaultIndex: true,
                            errorHandler: true,
                            verbose: true,
                            // stream: process.stdout,
                            ...spec,
                        };

                        const budoServer = budo(info.path, budoSpec);
                        if (socketType === MUDO_SOCKET_TYPES.WEBSOCKET) {
                            budoServer.on('connect', (event) => {
                                const httpServer = event.server;
                                const socketServer = new MuWebSocketServer({
                                    server:httpServer,
                                });
                                const muServer = new MuServer(socketServer);

                                // load and run server
                                require(serverPath)(muServer);
                            });
                        }
                    });
                });
        });
}