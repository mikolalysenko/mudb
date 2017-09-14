import { INetServer } from './inet';
import { LocalServerConfig } from './local';
export declare type ServerConfig = {
    local?: LocalServerConfig;
};
export declare function createServer(config?: ServerConfig): INetServer;
