import { HelServer } from './net';

import { HelLocalServerSpec, createLocalServer } from './local/local';

export default function createServer (spec:{
    local?:HelLocalServerSpec,
}) : HelServer | null {
    if (spec.local) {
        return createLocalServer(spec.local);
    }
    return null;
}