import { MuSessionId } from '../../core/socket';
import { MuLocalSocket, MuLocalSocketServer } from './server-socket';

export function createLocalSocketServer () : MuLocalSocketServer {
    return new MuLocalSocketServer();
}

export function createLocalSocket (spec:{
    sessionId:MuSessionId;
    server:MuLocalSocketServer;
}) : MuLocalSocket {
    const server = spec.server;

    // manually spawn and relate sockets on both sides
    const clientSocket = new MuLocalSocket(spec.sessionId, server);
    const serverSocket = new MuLocalSocket(spec.sessionId, server);
    clientSocket._duplex = serverSocket;
    serverSocket._duplex = clientSocket;

    server._handleConnection(serverSocket);
    return clientSocket;
}
