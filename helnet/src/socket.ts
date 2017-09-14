import { HelSocket, HelSessionId } from './net';

import { createLocalClient, HelLocalSocketSpec } from './local/local';

export default function connectToServer (spec:{
    sessionId:HelSessionId,
    local?:HelLocalSocketSpec,
}) : HelSocket | null {
    if (spec.local) {
        return createLocalClient(spec.sessionId, spec.local);
    }
    return null;
}