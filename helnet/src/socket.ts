import { HelSocket, HelSessionId } from './net';

import { createLocalClient, HelLocalSocketSpec } from './local/local';

export = function connectToServer (spec:{
    sessionId:HelSessionId,
    local?:HelLocalSocketSpec,
}) : HelSocket {
    if (spec.local) {
        return createLocalClient(spec.sessionId, spec.local);
    }
    throw new Error('invalid socket configuration');
};