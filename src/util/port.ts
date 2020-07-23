import tcp = require('net');

export function findPort (cb:(port:number) => void) {
    const server = tcp.createServer();
    server.on('error', (e) => console.error(e));
    server.unref();
    server.listen(() => {
        const port = server.address().port;
        server.close(() => cb(port));
    });
}

export function findPortAsync () : Promise<number> {
    return new Promise((resolve) => {
        findPort(resolve);
    });
}
