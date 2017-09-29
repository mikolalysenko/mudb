import { MuSocketServer } from './net';

import { MuLocalSocketServerSpec, createLocalServer } from './local/local';

export = function createServer (spec:{
    local?:MuLocalSocketServerSpec,
}) : MuSocketServer {
    if (spec.local) {
        return createLocalServer(spec.local);
    }
    throw new Error('invalid server configuration');
};