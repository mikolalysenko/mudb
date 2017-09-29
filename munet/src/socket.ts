import { MuSocket, MuSessionId } from './net';

import { createLocalClient, MuLocalSocketSpec } from './local/local';

export = function connectToServer (spec:{
    sessionId:MuSessionId,
    local?:MuLocalSocketSpec,
}) : MuSocket {
    if (spec.local) {
        return createLocalClient(spec.sessionId, spec.local);
    }
    throw new Error('invalid socket configuration');
};