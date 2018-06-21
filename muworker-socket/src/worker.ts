import {
    MuWorkerSocketServer,
    MuWorkerSocket,
} from './server-socket';
import { MuServer } from 'mudb';

const socketServer = new MuWorkerSocketServer();
const muServer = new MuServer(socketServer);

onmessage = (ev) => {
    const serverSocket = new MuWorkerSocket(ev.data.sessionId, self);
    socketServer._handleConnection(serverSocket);

    // TODO pass in spec for `start()`
    muServer.start();
};
