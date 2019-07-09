import tcp = require('net');
import { spawn } from 'child_process';

function getFreePort (cb:(port:number) => void) {
    const server = tcp.createServer();
    server.on('error', (e) => console.error(e));
    server.unref();
    server.listen(() => {
        const port = server.address().port;
        server.close(() => cb(port));
    });
}

getFreePort((port) => {
    const cwd = __dirname;

    const server = spawn(
        'ts-node',
        [ '_/start-server.ts', `${port}` ],
        { cwd },
    );
    server.stdout.once('data', (data) => console.log(`${data}`));

    const test = spawn(`browserify ${cwd}/_/web.ts -p [ tsify ] -t [ envify --PORT ${port} ] | tape-run`, [], {
        cwd,
        shell: true,
        stdio: 'inherit',
    });
    test.on('exit', process.exit);
});
