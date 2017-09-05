import { INetClient } from './inet';
import { LocalClientConfig, createLocalClient } from './local';

export type NetClientConfig = {
    sessionId?:string;
    sessionData?:string;
    local?:LocalClientConfig;
};

export function createNetClient (config:ClientConfig) : INetClient|null {
    if (config.local) {
        return createLocalClient(config.local);
    }
    return null;
}
