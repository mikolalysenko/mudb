import tcp = require('net');

export = function getFreePort (cb:(port:number) => void) {
    const server = tcp.createServer();
    server.on('error', (e) => console.error(e));
    server.unref();
    server.listen(() => {
        const port = server.address().port;
        server.close(() => cb(port));
    });
};
