import { INetClient } from './inet';
import { LocalClientConfig } from './local';
export declare type NetClientConfig = {
    sessionId?: string;
    sessionData?: string;
    local?: LocalClientConfig;
};
export declare function createNetClient(config: NetClientConfig): INetClient | null;
