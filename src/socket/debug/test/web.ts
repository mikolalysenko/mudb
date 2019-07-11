import { spawn } from 'child_process';

import getFreePort = require('../../util/get-free-port');

getFreePort((port) => {
    const cwd = __dirname;

    const server = spawn(
        'ts-node',
        [ '_/start-server.ts', `${port}` ],
        { cwd },
    );
    server.stdout.once('data', (data) => console.log(`${data}`));

    const test = spawn(`browserify _/web.ts -p [ tsify ] -t [ envify --PORT ${port} ] | tape-run`, [], {
        cwd,
        shell: true,
        stdio: 'inherit',
    });
    test.on('exit', process.exit);
});
