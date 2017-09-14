import { HelServer } from './net';

import { HelLocalServerSpec, createLocalServer } from './local/local';

export default function createServer (spec:{
    local?:HelLocalServerSpec,
}) : HelServer {
    if (spec.local) {
        return createLocalServer(spec.local);
    }
    throw new Error('invalid server configuration');
}