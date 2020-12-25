import * as tcp from 'net';

export function findPort (cb:(port:number) => void) {
    const server = tcp.createServer();
    server.on('error', (e) => console.error(e));
    server.unref();
    server.listen(() => {
        const addr = server.address();
        if (typeof addr === 'string') {
            server.close(() => cb(+addr));
        } else {
            const port = addr.port;
            server.close(() => cb(port));
        }
    });
}

export function findPortAsync () : Promise<number> {
    return new Promise((resolve) => {
        findPort(resolve);
    });
}
