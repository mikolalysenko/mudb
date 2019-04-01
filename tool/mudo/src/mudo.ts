import { MuClient, MuServer } from 'mudb';
import { MuWebSocketServer } from 'mudb/socket/web/server';
import path = require('path');
import temp = require('temp');
import fs = require('fs');
import budo = require('budo');

export enum MUDO_SOCKET_TYPES {
    LOCAL = 0,
    WEB = 1,
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
var MuServer = require('${require.resolve('mudb/server').replace(/\\/g, '\\\\')}').MuServer;
var launchServer = require('${spec.serverPath.replace(/\\/g, '\\\\')}');
var muLocalSocket = require('${require.resolve('mudb/socket/local').replace(/\\/g, '\\\\')}');

var socketServer = muLocalSocket.createLocalSocketServer();
var server = new MuServer(socketServer);
launchServer(server);

var socket = muLocalSocket.createLocalSocket({
    sessionId: Math.round(1e12 * Math.random()).toString(32),
    server: socketServer
});
`;
    }

    function generateWebSocket() {
        return `
var MuWebSocket = require('${require.resolve('mudb/socket/web/client').replace(/\\/g, '\\\\')}').MuWebSocket;
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
            case MUDO_SOCKET_TYPES.WEB:
                return generateWebSocket();
        }
    }

    return `
var MuClient = require('${require.resolve('mudb/client').replace(/\\/g, '\\\\')}').MuClient;
var runClient = require('${spec.clientPath.replace(/\\/g, '\\\\')}');

${generateSocket()}

var client = new MuClient(socket);
runClient(client);
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

    // file name to server
    serve?:string,

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

                        const budoSpec = {
                            live: false,
                            debug: true,
                            errorHandler: true,
                            verbose: true,
                            stream: process.stdout,
                            ...spec,
                        };

                        const budoServer = budo(info.path, budoSpec);
                        if (socketType === MUDO_SOCKET_TYPES.WEB) {
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
