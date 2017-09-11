import { INetServer } from './inet';
import { LocalServerConfig, createLocalServer } from './local';

export type ServerConfig = {
    local?:LocalServerConfig;
};

export function createServer (config?:ServerConfig) : INetServer {
    if (config) {
        if (config.local) {
            return createLocalServer(config.local);
        }
    }
    return createLocalServer();
}
