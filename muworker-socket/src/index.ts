import { MuServer } from 'mudb';
import { MuSessionId } from 'mudb/socket';
import { MuWorkerSocket } from './server-socket';

export function createWorkerServer () {
    return new Worker('server.js');
}

export function createWorkerSocket (spec:{
    sessionId:MuSessionId,
    server:Worker,
}) {
    const sessionId = spec.sessionId;
    const workerServer = spec.server;
    workerServer.postMessage({ sessionId });

    const clientSocket = new MuWorkerSocket(sessionId, workerServer);
    return clientSocket;
}
