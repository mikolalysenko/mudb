import { HelSocketServer } from './net';

import { HelLocalServerSpec, createLocalServer } from './local/local';

export = function createServer (spec:{
    local?:HelLocalServerSpec,
}) : HelSocketServer {
    if (spec.local) {
        return createLocalServer(spec.local);
    }
    throw new Error('invalid server configuration');
};