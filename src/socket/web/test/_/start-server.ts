import { createServer } from 'http';

import { MuWebSocketServer } from '../../server';

const server = createServer();
const socketServer = new MuWebSocketServer({ server });

const port = process.argv[2];
server.listen(port);

socketServer.start({
    ready: () => {
        console.log(`server listening on port ${server.address().port}...`);
    },
    connection: () => { },
    close: () => { },
});
