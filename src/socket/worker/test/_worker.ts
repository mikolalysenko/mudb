import { createWorkerSocketServer } from '../server';
import { MuServer } from '../../../core/server';

module.exports = () => {
    const socketServer = createWorkerSocketServer();
    const muServer = new MuServer(socketServer);

    socketServer.listen();
    muServer.start();
};
