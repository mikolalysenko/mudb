import { HelSessionId, HelSocket, HelSocketSpec, HelData } from '../net';
export declare class HelWebSocketDOM implements HelSocket {
    readonly sessionId: HelSessionId;
    private _started;
    private _closed;
    private _reliableSocket;
    private _unreliableSockets;
    private _currentSocket;
    private _url;
    private _numUnreliable;
    open: boolean;
    private _onMessage;
    private _onUnreliableMessage;
    private _onClose;
    constructor(sessionId: HelSessionId, url: string, numUnreliable: number);
    start(spec: HelSocketSpec): void;
    send(message: HelData): void;
    sendUnreliable(message: HelData): void;
    close(): void;
}
export declare function connectToServer(spec: {
    sessionId: HelSessionId;
    url: string;
    numUnreliable?: number;
}): HelWebSocketDOM;
