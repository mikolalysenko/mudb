import { createWorkerSocketServer } from '../../server';
import { MuServer } from '../../../../server';

module.exports = () => {
    const socketServer = createWorkerSocketServer();
    const muServer = new MuServer(socketServer);

    socketServer.listen();
    muServer.start();
};
