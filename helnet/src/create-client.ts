import { INetClient } from './inet';
import { LocalClientConfig, createLocalClient } from './local';

export type ClientConfig = {
    sessionId?:string;
    sessionData?:string;
    local?:LocalClientConfig;
};

export function createClient (config:ClientConfig) : INetClient|null {
    if (config.local) {
        return createLocalClient(config.local);
    }
    return null;
}
